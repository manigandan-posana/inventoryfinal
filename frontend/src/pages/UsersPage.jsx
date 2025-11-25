import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

export default function UsersPage() {
  const { token, currentUser } = useSelector((state) => state.auth);
  const canUseAdmin = ["ADMIN", "CEO", "COO"].includes(currentUser?.role);
  const target = token ? (canUseAdmin ? "/admin/materials" : "/workspace") : "/";
  return <Navigate to={target} replace />;
}
