import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

const CommonPrivateRoutes = () => {
    const { adminInfo } = useSelector((state) => state.adminAuth);
    const { userInfo } = useSelector((state) => state.auth);

    return (userInfo || adminInfo) ? <Outlet/> : <Navigate to='/login' replace />
}

export default CommonPrivateRoutes;