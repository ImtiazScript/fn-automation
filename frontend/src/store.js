import { configureStore } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web
import { combineReducers } from "redux";
import authReducer from './slices/authSlice.js';
import { apiSlice } from "./slices/apiSlice.js";
import integrationReducer from './slices/integrationSlice.js';
import cronsReducer from './slices/cronsSlice.js';
import userContextReducer from './slices/userContextSlice.js';

// Persist configuration
const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['auth', 'integration', 'userContext'], // Only persist these slices
    // blacklist: ['someNonPersistentSlice'], // or blacklist slices you don't want to persist
};

// Combine reducers
const rootReducer = combineReducers({
    auth: authReducer,
    [apiSlice.reducerPath]: apiSlice.reducer,
    integration: integrationReducer,
    crons: cronsReducer,
    userContext: userContextReducer,
});

// Create a persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the store
const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            },
        }).concat(apiSlice.middleware),
    devTools: true,
});

// Create a persistor
export const persistor = persistStore(store);

export default store;
