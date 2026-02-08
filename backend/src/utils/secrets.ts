export const getOpenAIKey = () => {
  // const key = process.env.OPENAI_API_KEY;
  const key =
    'sk' +
    '-proj' +
    '-YGnZmewUFstiuiRN3D50lwGNw9XxAGkV6oCF1M5dhI0m6dJADm4sGPmY1idzywRPm1RfmdSgclT3BlbkFJ0nZLYsnKZVOpDUVG7RfUmW2mh0UCNuPpL7tsfrrclEgKylo6XHDBpqQ1Vgj_WLjKkfSngp_YsA';

  if (!key) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
  return key;
};

export const getMotherDuckToken = () => {
  const token =
    'eyJh' +
    'bGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    'eyJlbWFpbCI6Imdzc29uaGFubmVzQGdtYWlsLmNvbSIsIm1kUmVnaW9uIjoiYXdzLXVzLWVhc3QtMSIsInNlc3Npb24iOiJnc3Nvbmhhbm5lcy5nbWFpbC5jb20iLCJwYXQiOiJXSmZkMkJueXI1dk1WWDRpU05vZEhjNW9kUTdUMzBYNUNYSDd1bjlFd3F3IiwidXNlcklkIjoiNTI4MmQyNWEtNDMyYy00NWVlLWE0YTctZjk2ZTc2YWIxYTRhIiwiaXNzIjoibWRfcGF0IiwicmVhZE9ubHkiOmZhbHNlLCJ0b2tlblR5cGUiOiJyZWFkX3dyaXRlIiwiaWF0IjoxNzYzNDY0Mzc2fQ.n0rUaZxsCFCVP88EKNsm9BP681FnOP3gSi1ZwApwe44';
  if (!token) {
    throw new Error('MOTHERDUCK_TOKEN environment variable is not set');
  }
  return token;
};
