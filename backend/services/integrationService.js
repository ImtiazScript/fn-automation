import Integration from '../models/integrationModel.js';
import { makeRequest } from "../utils/makeRequest.js";

class IntegrationService {
  constructor(userId) {
    this.userId = userId;
  }

  
  /**
   * Fetches the integration details associated with the current user.
   *
   * @async
   * @function fetchIntegration
   * @returns {Promise<Object|null>} A promise that resolves to the integration object if found, or null if not found.
   * @throws {Error} If there is an error during the fetching process.
   *
   * @example
   * const integrationDetails = await fetchIntegration();
   * console.log(integrationDetails);
   */
  async fetchIntegration() {
    try {
      const integration = await Integration.findOne({ userId: this.userId });
      return integration;
    } catch (error) {
      throw new Error('Error fetching integrations');
    }
  }


  /**
   * Refreshes the access token for the current user based on the stored refresh token.
   *
   * @async
   * @function refreshAccessToken
   * @returns {Promise<boolean>} A promise that resolves to true if the access token was refreshed successfully, or false if not.
   * @throws {Error} If there is an error during the refresh process.
   *
   * @example
   * const isRefreshed = await refreshAccessToken();
   * console.log(isRefreshed); // true if refreshed, false otherwise
   */
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


  /**
   * Updates the integration status for the current user.
   *
   * @async
   * @function updateIntegrationStatus
   * @param {boolean} isConnected - Indicates whether the integration is connected or not.
   * @returns {Promise<void>} A promise that resolves when the status is updated.
   *
   * @example
   * await updateIntegrationStatus(true); // Marks the integration as connected
   */
  async updateIntegrationStatus(isConnected) {
    const integration = await Integration.findOne({ userId: this.userId });
    if (integration) {
      integration.integrationStatus = isConnected ? 'Connected' : 'Not Connected';
      await integration.save();
    }
  }
}

export default IntegrationService;
