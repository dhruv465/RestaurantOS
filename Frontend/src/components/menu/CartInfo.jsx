import React, { useRef, useEffect, useState } from "react";
import { MdDeleteForever } from "react-icons/md";
import { FaNotesMedical } from "react-icons/fa6";
import { useSelector, useDispatch } from "react-redux";
import { removeItem, updateItemInstructions } from "../../redux/slices/cartSlice";

const CartInfo = ({ orderData, tableId }) => {
  // Get tableId from props or from wherever you're tracking the current table
  const currentTableId = tableId || "default-table";
  const cartData = useSelector((state) => state.cart);
  const scrolLRef = useRef();
  const dispatch = useDispatch();
  const [editingItemId, setEditingItemId] = useState(null);
  const [instructionText, setInstructionText] = useState("");
  const [displayedInstructions, setDisplayedInstructions] = useState({});

  // Helper function to get table-specific instructions from localStorage
  const getTableItemInstructions = (tableId, itemId) => {
    const key = `table_${tableId}_item_${itemId}_instructions`;
    return localStorage.getItem(key);
  };

  // Helper function to save table-specific instructions to localStorage
  const saveTableItemInstructions = (tableId, itemId, instructions) => {
    const key = `table_${tableId}_item_${itemId}_instructions`;
    if (instructions) {
      localStorage.setItem(key, instructions);
    } else {
      localStorage.removeItem(key);
    }
  };

  // Load instructions from localStorage when component mounts or cart changes
  useEffect(() => {
    const newDisplayedInstructions = {};
    
    cartData.forEach(item => {
      const savedInstructions = getTableItemInstructions(currentTableId, item.id);
      if (savedInstructions) {
        newDisplayedInstructions[item.id] = savedInstructions;
      }
    });
    
    setDisplayedInstructions(newDisplayedInstructions);
  }, [cartData, currentTableId]);

  useEffect(() => {
    if(scrolLRef.current){
      scrolLRef.current.scrollTo({
        top: scrolLRef.current.scrollHeight,
        behavior: "smooth"
      })
    }
  },[cartData]);

  const handleRemove = (itemId) => {
    // When removing an item, also remove its instructions from localStorage
    saveTableItemInstructions(currentTableId, itemId, null);
    
    // Create a new displayed instructions object without the removed item
    const newDisplayedInstructions = {...displayedInstructions};
    delete newDisplayedInstructions[itemId];
    setDisplayedInstructions(newDisplayedInstructions);
    
    dispatch(removeItem(itemId));
  };
  
  const handleNoteClick = (itemId) => {
    setEditingItemId(itemId);
    // Get instructions from our local state which mirrors localStorage
    const currentInstructions = displayedInstructions[itemId] || "";
    setInstructionText(currentInstructions);
  };
  
  const saveInstructions = () => {
    if (editingItemId !== null) {
      const trimmedInstructions = instructionText.trim();
      
      // Save to localStorage for this specific table
      saveTableItemInstructions(currentTableId, editingItemId, trimmedInstructions);
      
      // Update our local state to display the instructions
      setDisplayedInstructions({
        ...displayedInstructions,
        [editingItemId]: trimmedInstructions
      });
      
      setEditingItemId(null);
      setInstructionText("");
    }
  };
  
  const cancelEditing = () => {
    setEditingItemId(null);
    setInstructionText("");
  };

  return (
    <div className="px-4 py-2">
      <h1 className="text-[var(--text-color)] font-semibold tracking-wide text-md">
        Order Details {tableId && `- Table ${tableId}`}
      </h1>
      <div
        className="mt-4 overflow-y-scroll scrollbar-hide h-[380px]"
        ref={scrolLRef}
      >
        {cartData.length === 0 ? (
          // If cartData is empty, show "Your cart is empty"
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-[var(--text-color)] font-semibold text-lg opacity-80">
              Your cart is empty
            </p>
          </div>
        ) : (
          // If cartData has items, display them
          cartData.map((item) => (
            <div
              key={item.id}
              className="rounded-lg px-4 py-4 mb-2 bg-[var(--main-bg)]"
            >
              <div className="flex items-center justify-between">
                <h1 className="text-[var(--text-color)] font-semibold tracking-wide text-md">
                  {item.name}
                </h1>
                <p className="text-[var(--text-color)] font-semibold">
                  x{item.quantity}
                </p>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-3">
                  <MdDeleteForever
                    onClick={() => handleRemove(item.id)}
                    className="text-[var(--text-color)] cursor-pointer size={20}"
                  />
                  <FaNotesMedical 
                    onClick={() => handleNoteClick(item.id)}
                    className="text-[var(--text-color)] cursor-pointer size={20}" 
                  />
                </div>
                <p className="text-[var(--text-color)] text-md font-bold">
                  ₹ {item.price}
                </p>
              </div>
              
              {/* Display instructions if they exist in our local state */}
              {displayedInstructions[item.id] && (
                <div className="mt-2 text-sm text-[var(--text-color)] opacity-80 bg-[var(--secondary-bg)] p-2 rounded">
                  <span className="font-medium">Instructions:</span> {displayedInstructions[item.id]}
                </div>
              )}
              
              {/* Edit instructions interface */}
              {editingItemId === item.id && (
                <div className="mt-2">
                  <textarea
                    className="w-full p-2 text-sm rounded border border-[var(--border-color)] bg-[var(--input-bg)] text-[var(--text-color)]"
                    placeholder="Add special instructions for this dish..."
                    value={instructionText}
                    onChange={(e) => setInstructionText(e.target.value)}
                    rows={2}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2 mt-1">
                    <button 
                      onClick={cancelEditing}
                      className="px-2 py-1 text-xs rounded bg-[var(--secondary-bg)] text-[var(--text-color)]"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={saveInstructions}
                      className="px-2 py-1 text-xs rounded bg-[var(--accent-color)] text-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CartInfo;