import { UserCheck } from 'lucide-react';
import {
  BlockDefinition,
  ContentBlockItemProps,
  BlockData,
  BlockRendererProps,
} from '../types';
import {
  PatientBlockForm,
  PatientBlockItem,
  PatientBlockPreview,
} from './patient-block-components/PatientBlockForm';
import { PatientRenderer } from './patient-block-components/PatientRenderer';
import { PatientChatRenderer } from './patient-block-components/PatientChatRenderer';

export const PatientBlock: BlockDefinition = {
  type: 'patientAuth',
  name: 'Patient Authentication',
  description: 'Patient authentication with conditional data collection',
  icon: <UserCheck className="w-4 h-4" />,
  defaultData: {
    type: 'patientAuth',
    fieldName: 'authResults',
    authMethod: 'otp', // 'otp' or 'password'
    authField: 'email', // 'email' or 'phone'
    sendOtpUrl: '/api/v2/patient/send-otp',
    validateAuthUrl: '/api/v2/patient/validate',
    updatePatientUrl: '/api/v2/patient/update',
    tokenField: 'token',
    tokenStorageKey: 'authToken',
    validateTokenUrl: '',
    requireFirstName: true,
    requireMiddleName: false,
    requireLastName: true,
    requireGender: false,
    requireGenderBiological: true,
    requireDateOfBirth: true,
    requireHeight: true,
    requireWeight: true,
    firstNameLabel: 'First Name',
    middleNameLabel: 'Middle Name',
    lastNameLabel: 'Last Name',
    genderLabel: 'Gender',
    genderBiologicalLabel: 'Biological Gender',
    dateOfBirthLabel: 'Date of Birth',
    heightLabel: 'Height',
    weightLabel: 'Weight',
    collectAlternateContact: true,
    alternateContactRequired: true,
    fieldMappings: {},
    customHeaders: {},
    additionalBodyParams: {},
    skipIfLoggedIn: true,
    showContinueButton: false,
  },
  renderItem: (props: ContentBlockItemProps) => <PatientBlockItem {...props} />,
  renderFormFields: (props: ContentBlockItemProps) => (
    <PatientBlockForm {...props} />
  ),
  renderPreview: () => <PatientBlockPreview />,
  renderBlock: (props: BlockRendererProps) => <PatientRenderer {...props} />,
  chatRenderer: (props) => <PatientChatRenderer {...props} />,
  validate: (data: BlockData) => {
    if (!data.validateAuthUrl) {
      return 'Validate authentication URL is required';
    }
    if (data.authMethod === 'otp' && !data.sendOtpUrl) {
      return 'Send OTP URL is required when using OTP authentication';
    }
    if (!data.updatePatientUrl) {
      return 'Update patient information URL is required';
    }
    return null;
  },
  // Input schema - tells AI what fields to collect from the user
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        optional: true,
        description: 'Patient email address for authentication',
      },
      phone: {
        type: 'string',
        optional: true,
        description: 'Patient phone number for authentication',
      },
      otp: {
        type: 'string',
        optional: true,
        description: 'One-time password verification code',
      },
      firstName: {
        type: 'string',
        optional: true,
        description: 'Patient first name',
      },
      lastName: {
        type: 'string',
        optional: true,
        description: 'Patient last name',
      },
      gender: {
        type: 'string',
        optional: true,
        description: 'Patient gender identity',
      },
      dateOfBirth: {
        type: 'string',
        optional: true,
        description: 'Patient date of birth in MM-DD-YYYY format',
      },
      height: {
        type: 'number',
        optional: true,
        description: 'Patient height in total inches',
      },
      weight: {
        type: 'number',
        optional: true,
        description: 'Patient weight in pounds',
      },
    },
  },
  // Output schema - this block returns a patient authentication object with patient data
  outputSchema: {
    type: 'object',
    properties: {
      patient: {
        type: 'object',
        description: 'Complete patient information object',
      },
      token: {
        type: 'string',
        description: 'Authentication token',
      },
      firstName: {
        type: 'string',
        optional: true,
        description: 'Patient first name',
      },
      middleName: {
        type: 'string',
        optional: true,
        description: 'Patient middle name',
      },
      lastName: {
        type: 'string',
        optional: true,
        description: 'Patient last name',
      },
      email: {
        type: 'string',
        optional: true,
        description: 'Patient email address',
      },
      phone: {
        type: 'string',
        optional: true,
        description: 'Patient phone number',
      },
      gender: {
        type: 'string',
        optional: true,
        description: 'Patient gender identity',
      },
      genderBiological: {
        type: 'string',
        optional: true,
        description: 'Patient biological gender',
      },
      dateOfBirth: {
        type: 'string',
        optional: true,
        description: 'Patient date of birth',
      },
      height: {
        type: 'string',
        optional: true,
        description: 'Patient height',
      },
      weight: {
        type: 'string',
        optional: true,
        description: 'Patient weight',
      },
    },
  },
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};
