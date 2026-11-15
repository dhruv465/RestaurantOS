import { useEffect, useState } from "react";
import { getUserData } from "../https";
import { useDispatch } from "react-redux";
import { removeUser, setUser } from "../redux/slices/userSlice";

// Restores the signed-in person on page load. Signed out: ProtectedRoutes sends them to /auth.
const useLoadData = () => {
    const dispatch = useDispatch();
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const { data } = await getUserData();
                const { _id, name, email, phone, role, permissions } = data.data;
                dispatch(setUser({ _id, name, email, phone, role, permissions }));
            } catch {
                dispatch(removeUser());
            } finally {
                setIsLoading(false);
            }
        };
        fetchUser();
    }, [dispatch]);

    return isLoading;
};

export default useLoadData;
