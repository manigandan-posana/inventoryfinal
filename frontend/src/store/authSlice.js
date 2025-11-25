import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";

const initialState = {
  token: null,
  currentUser: null,
  adminLoginError: "",
  userLoginError: "",
  adminLoginLoading: false,
  userLoginLoading: false,
  dataVersion: 0,
  checkingSession: true,
};

const ADMIN_PORTAL_ROLES = ["ADMIN", "CEO", "COO"];

export const restoreSession = createAsyncThunk(
  "auth/restoreSession",
  async (_, { rejectWithValue }) => {
    const storedToken = localStorage.getItem("inventory_token");
    if (!storedToken) {
      return { token: null, user: null };
    }
    try {
      const user = await api.session(storedToken);
      return { token: storedToken, user };
    } catch (err) {
      localStorage.removeItem("inventory_token");
      return rejectWithValue(err.message || "Session expired. Please sign in again.");
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async ({ mode, credentials }, { rejectWithValue }) => {
    try {
      const response = await api.login(credentials);
      if (mode === "admin" && !ADMIN_PORTAL_ROLES.includes(response.user?.role)) {
        throw new Error("Only Admin, CEO or COO can use the admin portal");
      }
      return { ...response, mode };
    } catch (err) {
      return rejectWithValue(err.message || "Unable to sign in");
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (token, { rejectWithValue }) => {
    try {
      if (token) {
        await api.logout(token);
      }
      return true;
    } catch (err) {
      return rejectWithValue(err.message || "Unable to sign out");
    }
  }
);

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setToken(state, action) {
      state.token = action.payload;
    },
    setCurrentUser(state, action) {
      state.currentUser = action.payload;
    },
    setAdminLoginError(state, action) {
      state.adminLoginError = action.payload || "";
    },
    setUserLoginError(state, action) {
      state.userLoginError = action.payload || "";
    },
    setAdminLoginLoading(state, action) {
      state.adminLoginLoading = Boolean(action.payload);
    },
    setUserLoginLoading(state, action) {
      state.userLoginLoading = Boolean(action.payload);
    },
    incrementDataVersion(state) {
      state.dataVersion += 1;
    },
    setCheckingSession(state, action) {
      state.checkingSession = Boolean(action.payload);
    },
    resetAuthState() {
      return { ...initialState, checkingSession: false };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(restoreSession.pending, (state) => {
        state.checkingSession = true;
        state.adminLoginError = "";
        state.userLoginError = "";
      })
      .addCase(restoreSession.fulfilled, (state, action) => {
        state.checkingSession = false;
        state.token = action.payload.token;
        state.currentUser = action.payload.user;
        if (action.payload.token && action.payload.user) {
          state.dataVersion += 1;
        }
      })
      .addCase(restoreSession.rejected, (state, action) => {
        state.checkingSession = false;
        state.token = null;
        state.currentUser = null;
        state.adminLoginError = action.payload || action.error.message;
        state.userLoginError = action.payload || action.error.message;
      })
      .addCase(login.pending, (state, action) => {
        const mode = action.meta?.arg?.mode;
        if (mode === "admin") {
          state.adminLoginLoading = true;
          state.adminLoginError = "";
        } else {
          state.userLoginLoading = true;
          state.userLoginError = "";
        }
      })
      .addCase(login.fulfilled, (state, action) => {
        state.token = action.payload.token;
        state.currentUser = action.payload.user;
        state.dataVersion += 1;
        localStorage.setItem("inventory_token", action.payload.token);
        state.adminLoginLoading = false;
        state.userLoginLoading = false;
        state.adminLoginError = "";
        state.userLoginError = "";
      })
      .addCase(login.rejected, (state, action) => {
        const mode = action.meta?.arg?.mode;
        const message = action.payload || action.error.message;
        if (mode === "admin") {
          state.adminLoginError = message;
          state.adminLoginLoading = false;
        } else {
          state.userLoginError = message;
          state.userLoginLoading = false;
        }
      })
      .addCase(logout.fulfilled, () => ({ ...initialState, checkingSession: false }))
      .addCase(logout.rejected, () => ({ ...initialState, checkingSession: false }));
  },
});

export const {
  setToken,
  setCurrentUser,
  setAdminLoginError,
  setUserLoginError,
  setAdminLoginLoading,
  setUserLoginLoading,
  incrementDataVersion,
  setCheckingSession,
  resetAuthState,
} = authSlice.actions;

export default authSlice.reducer;
