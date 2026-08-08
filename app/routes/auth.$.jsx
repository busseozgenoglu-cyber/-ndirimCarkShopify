import { authenticate } from "../shopify.server";

// /auth/* — OAuth başlangıcı ve geri dönüşü
export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};
