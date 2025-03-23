import { GoogleAuth } from 'google-auth-library';

// Configure authentication
const auth = new GoogleAuth({
  scopes: ['https://www.googleapis.com/auth/cloud-platform']
});

export const getAuthenticatedClient = async () => {
  const client = await auth.getClient();
  return client;
};

export const getAccessToken = async () => {
  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  return tokenResponse.token;
};
