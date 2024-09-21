import Integration from '../models/integrationModel.js';
import { makeRequest } from "../utils/makeRequest.js";

class IntegrationService {
  constructor(userId) {
    this.userId = userId;
  }

  // Fetch integration details by userId
  async fetchIntegration() {
    try {
      const integration = await Integration.findOne({ userId: this.userId });
      return integration;
    } catch (error) {
      throw new Error('Error fetching integrations');
    }
  }

  // Refresh access token by userId
  async refreshAccessToken() {
    const integrationInfo = await Integration.findOne({ userId: this.userId });
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
      const result = await makeRequest('POST', url, headers, data, {}, this.userId);

      if (result && result.access_token) {
        const { id: fnUserId } = result.user;
        let integration = await Integration.findOne({ fnUserId });

        if (integration) {
          // Update existing integration
          integration.fnAccessToken = result.access_token;
          integration.integrationStatus = 'Connected';
        }
        await integration.save();
        return true;
      } else {
        await this.updateIntegrationStatus(false);
        return false;
      }
    } catch (error) {
      await this.updateIntegrationStatus(false);
      return false;
    }
  }

  // Update integration status
  async updateIntegrationStatus(isConnected) {
    const integration = await Integration.findOne({ userId: this.userId });
    if (integration) {
      integration.integrationStatus = isConnected ? 'Connected' : 'Not Connected';
      await integration.save();
    }
  }
}

export default IntegrationService;
