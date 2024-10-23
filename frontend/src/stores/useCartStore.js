import { create } from "zustand";
import axios from "../lib/axios";
import toast from "react-hot-toast";

export const useCartStore = create((set,get) => ({
    cart: [],
    coupon: null,
    total: 0,
    subtotal: 0,
    isCouponApplied: false,

    getMyCoupon: async () => {
        try {
            const response = await axios.get("/coupons");
            set({ coupon: response.data });
        } catch (error) {
            console.error("Error fetching coupon:", error);
        }
    },

    applyCoupon: async (code) => {
        try {
            const response = await axios.post("/coupons/validate",{ code });
            set({ coupon: response.data, isCouponApplied: true });
            get().calculateTotals();
            toast.success("Coupon applied successfully");
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to apply coupon");
        }
    },

    removeCoupon: () => {
        set({ coupon: null, isCouponApplied: false });
        get().calculateTotals();

        toast.success("Coupon removed");
    },

    getCartItems: async () => {
        try {
            const res = await axios.get("/cart");
            set({ cart: res.data });
        } catch (error) {
            set({ cart: [] })
            toast.error(error.response.data.message || "An error occoured");
        }
    },

    addToCart: async (product) => {
        try {
           await axios.post('/cart',{ productId: product._id });
           toast.success("Product added to cart");

           set((prevState) => {
                const existingItem = prevState.cart.find((item) => item._id === product._id);
                const newCart = existingItem 
                ? prevState.cart.map((item) =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                ): [...prevState.cart,{ ...product, quantity: 1 }];
                return { cart: newCart };
           })
        } catch (error) {
            toast.error(error.response.data.message || "An error occoured");
        }
    },

    removeFromCart: async (productId) => {
        await axios.delete(`/cart`, { data: { productId } });
        set((prevState) => ({ cart: prevState.cart.filter((item) => item._id !== productId) }));
        get().calculateTotals();
    },

    updateQuantity: async (productId,quantity) => {
        try {
            if(quantity === 0) {
                get().removeFromCart(productId);
                return;
            }

            await axios.put(`/cart/${productId}`,{ quantity });
            set((prevState) => ({
                cart: prevState.cart.map((item) => (item._id === productId ? { ...item, quantity } : item)),
            }));

            get().calculateTotals();
         } catch (error) {
             toast.error(error.response.data.message || "An error occoured");
         }
    },

    calculateTotals: () => {
        const { cart, coupon } = get();
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        let total = subtotal;

        if (coupon) {
            const discount = subtotal * (coupon.discountPercentage / 100);
            total = subtotal - discount;
        }

        set({ subtotal, total });
    },

    clearCart: async () => {
        set({ cart: [], coupon: null, total: 0, subtotal: 0 });
    }
}))