import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { api } from "../api/client";

const initialState = {
  projects: [],
  materials: [],
  bomByProject: {},
  bomStatusByProject: {},
  status: "idle",
  error: "",
};

export const loadAllocationData = createAsyncThunk(
  "adminAllocations/load",
  async (token, { rejectWithValue }) => {
    try {
      const projects = [];
      const materials = [];

      let projectPage = 1;
      let hasMoreProjects = true;
      while (hasMoreProjects) {
        const response = await api.adminProjects(token, { page: projectPage, size: 50 });
        projects.push(...(response?.items || []));
        hasMoreProjects = Boolean(response?.hasNext);
        projectPage += 1;
      }

      let materialPage = 1;
      let hasMoreMaterials = true;
      while (hasMoreMaterials) {
        const response = await api.searchMaterials(token, { page: materialPage, size: 50 });
        materials.push(...(response?.items || []));
        hasMoreMaterials = Boolean(response?.hasNext);
        materialPage += 1;
      }

      return { projects, materials };
    } catch (err) {
      return rejectWithValue(err.message || "Unable to load allocation data");
    }
  }
);

export const fetchProjectBom = createAsyncThunk(
  "adminAllocations/fetchProjectBom",
  async ({ token, projectId }, { rejectWithValue }) => {
    try {
      const data = await api.projectAllocations(token, projectId);
      return { projectId, bom: data?.materials || [] };
    } catch (err) {
      return rejectWithValue({ message: err.message || "Unable to load project allocations", projectId });
    }
  }
);

export const createProjectAllocations = createAsyncThunk(
  "adminAllocations/createProjectAllocations",
  async ({ token, projectId, lines }, { rejectWithValue }) => {
    try {
      for (const line of lines) {
        await api.createProjectAllocation(token, projectId, {
          projectId,
          materialId: line.materialId,
          quantity: line.quantity,
        });
      }
      return { projectId };
    } catch (err) {
      return rejectWithValue(err.message || "Unable to create project allocations");
    }
  }
);

export const updateProjectAllocation = createAsyncThunk(
  "adminAllocations/updateProjectAllocation",
  async ({ token, projectId, materialId, payload }, { rejectWithValue }) => {
    try {
      await api.updateBomAllocation(token, projectId, materialId, payload);
      return { projectId };
    } catch (err) {
      return rejectWithValue(err.message || "Unable to update allocation");
    }
  }
);

export const deleteProjectAllocation = createAsyncThunk(
  "adminAllocations/deleteProjectAllocation",
  async ({ token, projectId, materialId }, { rejectWithValue }) => {
    try {
      await api.deleteProjectAllocation(token, projectId, String(materialId));
      return { projectId };
    } catch (err) {
      return rejectWithValue(err.message || "Unable to delete allocation");
    }
  }
);

const adminAllocationsSlice = createSlice({
  name: "adminAllocations",
  initialState,
  reducers: {
    clearAllocationError(state) {
      state.error = "";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAllocationData.pending, (state) => {
        state.status = "loading";
        state.error = "";
      })
      .addCase(loadAllocationData.fulfilled, (state, action) => {
        state.status = "succeeded";
        state.projects = action.payload.projects || [];
        state.materials = action.payload.materials || [];
      })
      .addCase(loadAllocationData.rejected, (state, action) => {
        state.status = "failed";
        state.projects = [];
        state.materials = [];
        state.error = action.payload || action.error.message;
      })
      .addCase(fetchProjectBom.pending, (state, action) => {
        const projectId = action.meta?.arg?.projectId;
        if (projectId !== undefined) {
          state.bomStatusByProject = { ...state.bomStatusByProject, [projectId]: "loading" };
        }
        state.error = "";
      })
      .addCase(fetchProjectBom.fulfilled, (state, action) => {
        const { projectId, bom } = action.payload || {};
        if (projectId !== undefined) {
          state.bomByProject = { ...state.bomByProject, [projectId]: bom || [] };
          state.bomStatusByProject = { ...state.bomStatusByProject, [projectId]: "succeeded" };
        }
      })
      .addCase(fetchProjectBom.rejected, (state, action) => {
        const projectId = action.meta?.arg?.projectId;
        const message = action.payload?.message || action.error.message;
        if (projectId !== undefined) {
          state.bomStatusByProject = { ...state.bomStatusByProject, [projectId]: "failed" };
        }
        state.error = message;
      })
      .addCase(createProjectAllocations.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(updateProjectAllocation.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      })
      .addCase(deleteProjectAllocation.rejected, (state, action) => {
        state.error = action.payload || action.error.message;
      });
  },
});

export const { clearAllocationError } = adminAllocationsSlice.actions;
export default adminAllocationsSlice.reducer;
