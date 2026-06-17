import { prisma } from './prisma';
import { BusinessConfig, BUSINESS_INFO } from './businessConfig';

export async function getBusinessConfig(): Promise<BusinessConfig> {
  try {
    const settings = await prisma.businessSettings.findUnique({
      where: { id: 'business-settings' },
    });
    if (settings) {
      return {
        shopName: settings.shopName,
        tagline: settings.tagline,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        gstin: settings.gstin,
        taxRate: settings.taxRate,
        taxLabel: settings.taxLabel,
      };
    }
  } catch (err) {
    // Fail-soft fallback for build time/migration runs
  }
  return { ...BUSINESS_INFO };
}
