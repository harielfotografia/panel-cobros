import {
  WebpayPlus,
  Options,
  Environment,
  IntegrationApiKeys,
  IntegrationCommerceCodes,
} from "transbank-sdk";

export function getWebpayTx(): InstanceType<typeof WebpayPlus.Transaction> {
  if (process.env.TRANSBANK_ENV === "production") {
    return new WebpayPlus.Transaction(
      new Options(
        process.env.TRANSBANK_COMMERCE_CODE!,
        process.env.TRANSBANK_API_KEY!,
        Environment.Production,
      ),
    );
  }
  // Integración: credenciales de prueba oficiales de Transbank
  return new WebpayPlus.Transaction(
    new Options(
      IntegrationCommerceCodes.WEBPAY_PLUS,
      IntegrationApiKeys.WEBPAY,
      Environment.Integration,
    ),
  );
}
