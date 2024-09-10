import { apiSlice } from "./apiSlice";
import {
    CRONS_DATA_FETCH_URL,
} from '../utils/constants.js';

export const commonApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getCronsData: builder.mutation({
            query: () => ({
                url: CRONS_DATA_FETCH_URL,
                method: 'GET'
            })
        }),
        getCronData: builder.mutation({
            query: (cronId) => ({
                url: `/api/v1/crons/get-cron/${cronId}`,
                method: 'GET'
            })
        }),
        addCron: builder.mutation({
            query: (data) => ({
                url: '/api/v1/crons/add-cron',
                method: 'POST',
                body: data
            })
        }),
        updateCronByCronId: builder.mutation({
            query: (data) => ({
                url: '/api/v1/crons/update-cron',
                method: 'PUT',
                body: data
            })
        }),
        getTypesOfWorkOrder: builder.mutation({
            query: () => ({
                url: `/api/v1/work-order-type/all`,
                method: 'GET'
            })
        }),
        deleteCron: builder.mutation({
            query: (params) => ({
                url: `/api/v1/crons/delete-cron/${params.cronId}`,
                method: 'DELETE',
            })
        }),
    })
})

export const {
    useGetCronsDataMutation,
    useGetCronDataMutation,
    useAddCronMutation,
    useUpdateCronByCronIdMutation,
    useGetTypesOfWorkOrderMutation,
    useDeleteCronMutation,
} = commonApiSlice;