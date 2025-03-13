import React, {useState, useEffect} from "react";
import { IoMdClose } from "react-icons/io";
import { motion } from "framer-motion";
import { addTable } from "../../https";
import { useMutation } from "@tanstack/react-query";
import { enqueueSnackbar } from "notistack";

const Modal = ({ isOpen, onClose }) => {
    const [tableData, setTableData] = useState({
        tableNo: "",
        seats: "",
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setTableData((prev) => ({ ...prev, [name]: value }));
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log(tableData)

        tableMutation.mutate(tableData);
    }

    const handleCloseModal = () => {
        onClose();
    };

    const tableMutation = useMutation({
        mutationFn: (reqData) => addTable(reqData),
        onSuccess: (res) => {
            onClose();
            const { data } = res;
            enqueueSnackbar(data.message, { variant: "success" });
        },
        onError: (error) => {
            const { data } = error.response;
            enqueueSnackbar(data.message, { variant: "error" });
            console.log(error);
        }
    })

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className="bg-[var(--card-bg)] p-4 rounded-md shadow-md w-96 h-96"
            >
                <div className="flex justify-between item-center mb-4">
                    <h2 className="text-lg font-bold text-[var(--text-color)]">Add Table</h2>

                    <button
                        onClick={handleCloseModal}
                        className="text-[var(--text-color)]"
                    >
                        <IoMdClose size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 mt-10">
                    <div className="flex flex-col gap-4">
                        <label className="block text-[#ababab] text-sm font-medium">
                            Table Number
                        </label>
                        <div>
                            <input
                                type="number"
                                value={tableData.tableNo}
                                onChange={handleInputChange}
                                name="tableNo"
                                className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
                                id=""
                            />
                        </div>
                    </div>
                    <div className="flex flex-col gap-4">
                        <label className="block text-[#ababab] text-sm font-medium">
                            Number of Seats
                        </label>
                        <div>
                            <input
                                type="number"
                                value={tableData.seats}
                                onChange={handleInputChange}
                                name="seats"
                                className="w-full bg-[var(--input-bg)] text-[var(--text-color)] rounded-lg p-2 focus:ring-2 focus:ring-[var(--border-color)] focus:outline-none transition-all border border-[var(--border-color)]"
                                id=""
                            />
                        </div>
                    </div>

                    <button className="bg-[#F6b100] text-white rounded-lg py-3 w-full mt-8 hover:bg-[#F6b100]/90 transition-colors duration-200">
                        Add Table
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

export default Modal;