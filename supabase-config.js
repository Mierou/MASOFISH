/*
  MASOFISH Supabase configuration

  Replace the two placeholder values below with the values shown in:
  Supabase Dashboard -> Project Settings -> API

  IMPORTANT:
  - Use the Publishable key or legacy anon key.
  - Never place the service_role key in a browser application.
*/
window.MASOFISH_SUPABASE_CONFIG = {
  url: "https://fbcildaanahamvdoypyg.supabase.co",
  publishableKey: "sb_publishable_rt_1xmNyCeh2C1c2DEchlw_k2EI9yvz",

  // Set to false only while testing pages without real authentication.
  requireAuth: true,

  // Allows the setup page to open the prototype before Supabase is configured.
  // Change this to false before final production deployment.
  allowPrototypeMode: false
};
