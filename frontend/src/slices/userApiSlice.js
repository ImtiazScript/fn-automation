import { apiSlice } from "./apiSlice";
import { USER_AUTHENTICATION_URL, USER_LOGOUT_URL, USER_REGISTRATION_URL, USER_PROFILE_URL, INTEGRATE_USER_URL, FORGOT_PASSWORD_URL, RESET_PASSWORD_URL, USER_CONTEXT_URL } from '../utils/constants.js';

const USER_AUTH_URL = USER_AUTHENTICATION_URL; 

export const usersApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        login: builder.mutation({
            query: (data) => ({
                url: USER_AUTH_URL,
                method: 'POST',
                body: data
            })
        }),
        logout: builder.mutation({
            query: () => ({
                url: USER_LOGOUT_URL,
                method: 'POST'
            })
        }),
        register: builder.mutation({
            query: (data) => ({
                url: USER_REGISTRATION_URL,
                method: 'POST',
                body: data
            })
        }),
        updateUser: builder.mutation({
            query: (data) => ({
                url: USER_PROFILE_URL,
                method: 'PUT',
                body: data
            })
        }),
        integrateUser: builder.mutation({
            query: (data) => ({
                url: INTEGRATE_USER_URL,
                method: 'POST',
                body: data
            })
        }),
        integrationInfoByUserId: builder.mutation({
            query: (userId) => ({
                url: `/api/v1/integration/${userId}`,
                method: 'GET'
            })
        }),
        forgotPassword: builder.mutation({
            query: (data) => ({
                url: FORGOT_PASSWORD_URL,
                method: 'POST',
                body: data
            })
        }),
        resetPassword: builder.mutation({
            query: (data) => ({
                url: RESET_PASSWORD_URL,
                method: 'POST',
                body: data
            })
        }),
        userContext: builder.mutation({
            query: () => ({
                url: USER_CONTEXT_URL,
                method: 'GET',
            })
        }),
    })
})

export const { useLoginMutation, useLogoutMutation, useRegisterMutation, useUpdateUserMutation, useIntegrateUserMutation, useIntegrationInfoByUserIdMutation, useForgotPasswordMutation, useResetPasswordMutation, useUserContextMutation } = usersApiSlice;