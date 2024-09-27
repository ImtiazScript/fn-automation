import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  integrationInfo: null,
};

const integrationSlice = createSlice({
  name: 'integration',
  initialState,
  reducers: {
    setIntegrationInfo(state, action) {
      state.integrationInfo = action.payload;
    },
    clearIntegrationInfo(state) {
      state.integrationInfo = null;
    },
  },
});

export const { setIntegrationInfo, clearIntegrationInfo } = integrationSlice.actions;
export default integrationSlice.reducer;
