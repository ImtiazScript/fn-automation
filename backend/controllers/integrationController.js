// ===================================================== Integration Controller =====================================================

import asyncHandler from "express-async-handler";
import { makeRequest } from "../utils/integrationHelpers.js";
import Integration from "../models/integrationModel.js";
import IntegrationService from '../services/integrationService.js';

const connectAccount = asyncHandler(async (req, res) => {
    const { username, password, userId } = req.body;
    const integrationService = new IntegrationService(userId);
    const url = process.env.FN_AUTHENTICATE_URL;
    const data = new URLSearchParams({
        username,
        password,
        grant_type: 'password',
        client_id: process.env.FN_AUTHENTICATE_CLIENT_ID,
        client_secret: process.env.FN_AUTHENTICATE_CLIENT_SECRET,
    });
    const headers = {};

    try {
        const result = await makeRequest('POST', url, headers, data);

        if (result && result.access_token) {
            const { id: fnUserId } = result.user;
            let integration = await Integration.findOne({ fnUserId });
            if (integration) {
                // Update existing integration
                integration.fnUserName = username;
                integration.fnPassword = password;
                integration.fnAccessToken = result.access_token;
                integration.fnRefreshToken = result.refresh_token;
                integration.fnRefreshTokenGeneratedAt = new Date();
                integration.integrationStatus = 'Connected';
            } else {
                // Create new integration
                integration = new Integration({
                    userId: userId,  // assuming you're attaching the logged-in user
                    fnUserId,
                    fnUserName: username,
                    fnPassword: password,
                    fnAccessToken: result.access_token,
                    fnRefreshToken: result.refresh_token,
                    fnRefreshTokenGeneratedAt: new Date(),
                    integrationStatus: 'Connected',
                });
            }
            await integration.save();
            res.status(200).json(integration);
        } else {
            await integrationService.updateIntegrationStatus(false);
            res.status(400).json({ message: 'Failed to retrieve access token' });
        }
    } catch (error) {
        await integrationService.updateIntegrationStatus(false);
        res.status(500).json({ message: 'Failed to connect account', error: error.message });
    }
});

// @desc    Refresh access token by refresh_token
// @route   GET /api/v1/integration/:id
// @access  Private
const getIntegrationInfoByUserId = asyncHandler(async (req, res) => {
    const integrationInfo = await Integration.findOne({userId: req.params.id});
    let lastTimeRefreshTokenGeneratedAt = '';
    if (integrationInfo && integrationInfo.fnRefreshTokenGeneratedAt) {
        const fnRefreshTokenGeneratedAt = new Date(integrationInfo.fnRefreshTokenGeneratedAt);
        const currentDate = new Date();

        const differenceInTime = currentDate - fnRefreshTokenGeneratedAt;
        let differenceInDays = Math.floor(differenceInTime / (1000 * 3600 * 24));
        lastTimeRefreshTokenGeneratedAt = `${differenceInDays} ${differenceInDays > 1 ? 'days' : 'day'} ago`;
    }
    try {
        if (integrationInfo) {
            res.json({ ...integrationInfo.toObject(), lastTimeRefreshTokenGeneratedAt });
          } else {
            res.status(404).json({ message: 'Integration information not found' });
          }
    } catch (error) {
        console.error('Decryption error:', error);
        res.status(500).json({ message: 'Error decrypting password' });
    }
  });

  const refreshConnection = asyncHandler(async (req, res) => {
    const integrationInfo = await Integration.findOne({userId: req.params.id});
    const integrationService = new IntegrationService(userId);
    if (!integrationInfo.fnRefreshToken) {
        res.status(400).json({ message: 'Failed to retrieve existing refresh token' });
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
            res.status(200).json(integration);
        } else {
            await integrationService.updateIntegrationStatus(false);
            res.status(400).json({ message: 'Failed to retrieve access token' });
        }
    } catch (error) {
        await integrationService.updateIntegrationStatus(false);
        res.status(500).json({ message: 'Failed to re-connect account', error: error.message });
    }
});

export {
    connectAccount,
    getIntegrationInfoByUserId,
    refreshConnection,
  };