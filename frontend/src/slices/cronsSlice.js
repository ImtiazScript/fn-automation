import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  crons: null,
};

const cronsSlice = createSlice({
  name: 'crons',
  initialState,
  reducers: {
    setCrons(state, action) {
      state.crons = action.payload;
    },
    clearCrons(state) {
      state.crons = null;
    },
  },
});

export const { setCrons, clearCrons } = cronsSlice.actions;
export default cronsSlice.reducer;
