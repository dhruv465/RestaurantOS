import { useEffect } from "react";
import { getUserData } from "../https";
import { useDispatch } from "react-redux";
import { removeUser, setUser } from "../redux/slices/userSlice";
import { Navigate } from "react-router-dom";
import { useNavigate } from "react-router-dom";


const useLoadData = () => {

    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {

                const { data } = await getUserData();
                console.log(data);
                const { _id, name, email, phone, role } = data.data;
                dispatch(setUser({ _id, name, email, phone, role }));

            }
            catch (error) {
                dispatch(removeUser());
                Navigate("/auth");
                console.error(error);
            }
        }

        fetchUser();
    }, [ dispatch, navigate ]);


}

export default useLoadData;