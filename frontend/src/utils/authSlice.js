import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { authChecked: false },
  reducers: {
    setAuthChecked: (state) => {
      state.authChecked = true;
    },
  },
});

export const { setAuthChecked } = authSlice.actions;
export default authSlice.reducer;
