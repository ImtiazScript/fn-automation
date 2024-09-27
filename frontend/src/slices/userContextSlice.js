import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  userContext: null,
};

const userContextSlice = createSlice({
  name: 'userContext',
  initialState,
  reducers: {
    setuserContext(state, action) {
      state.userContext = action.payload;
    },
    clearuserContext(state) {
      state.userContext = null;
    },
  },
});

export const { setuserContext, clearuserContext } = userContextSlice.actions;
export default userContextSlice.reducer;
