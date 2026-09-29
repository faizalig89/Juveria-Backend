import 'dotenv/config';
import { UaePintAeSchematronService } from './dist/compliance/schematron/uae-pint-ae-schematron.service.js';

const service = new UaePintAeSchematronService();

try {
  await service.checkRuntimeDependencies();

  console.log('STAGE_16_6A_RUNTIME = PASS');
  console.log('JAVA_EXECUTION = PASS');
  console.log('SAXON_JAR_PRESENT = PASS');
  console.log('XML_RESOLVER_PRESENT = PASS');
  console.log('PINT_AE_SHARED_XSLT_PRESENT = PASS');
  console.log('PINT_AE_UAE_XSLT_PRESENT = PASS');
} catch (error) {
  console.error('STAGE_16_6A_RUNTIME = FAIL');
  console.error(
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
