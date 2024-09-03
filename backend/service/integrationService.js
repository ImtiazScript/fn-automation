import Integration from '../models/integrationModel.js';
import { makeRequest } from "../utils/integrationHelpers.js";

export const fetchIntegrationByUserId = async (userId) => {
  try {
    const integration = await Integration.findOne({userId}); // Exclude the password field for security reasons
    return integration;
  } catch (error) {
    throw new Error('Error fetching integrations');
  }
};

export const refreshAccessTokenByUserId = async (userId) => {
    const integrationInfo = await Integration.findOne({userId});
    if (!integrationInfo || !integrationInfo.fnRefreshToken) {
        return false;
    }
    const url = process.env.FN_REFRESH_AUTHENTICATION_URL;
    const data = new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: process.env.FN_AUTHENTICATE_CLIENT_ID,
        client_secret: process.env.FN_AUTHENTICATE_CLIENT_SECRET,
        refresh_token: integrationInfo.fnRefreshToken,
    });
    const headers = {};

    try {
        const result = await makeRequest('POST', url, headers, data);

        if (result && result.access_token) {
            const { id: fnUserId } = result.user;
            let integration = await Integration.findOne({ fnUserId });
            if (integration) {
                // Update existing integration
                integration.fnAccessToken= result.access_token;
                integration.integrationStatus = 'Connected';
            }
            await integration.save();
            return true;
        } else {
            await updateIntegrationStatus(userId, false);
            return false;
        }
    } catch (error) {
        await updateIntegrationStatus(userId, false);
        return false;
    }
}


export const updateIntegrationStatus = async (userId, isConnected) => {
    let integration = await Integration.findOne({ userId });
    if (integration) {
        integration.integrationStatus = isConnected ? 'Connected' : 'Not Connected';
        await integration.save();
    }
};