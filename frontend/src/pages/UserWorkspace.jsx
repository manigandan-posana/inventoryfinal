import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function UserWorkspace() {
  const token = useSelector((state) => state.auth.token);
  const preferredRoute = token ? "/workspace" : "/";
  return <Navigate to={preferredRoute} replace />;
}
