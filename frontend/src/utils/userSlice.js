import { createSlice } from '@reduxjs/toolkit';

const userSlice = createSlice({
  name: 'user',
  initialState: null,
  reducers: {
    addUser: (state, action) => action.payload,
    removeUser: () => null, // ✅ simple
    // OR: removeUser: (_state, _action) => null, // ✅ no ESLint warnings
  },
});

export const { addUser, removeUser } = userSlice.actions;
export default userSlice.reducer;
