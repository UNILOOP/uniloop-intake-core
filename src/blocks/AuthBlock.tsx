import React, { useEffect, useState, useRef } from 'react';
import {
  BlockDefinition,
  ContentBlockItemProps,
  BlockData,
  BlockRendererProps,
  ChatRendererProps,
} from '../types';
import { cn } from '../lib/utils';
import { themes } from '../themes';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Button } from '../components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '../components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  UserCheck,
  TestTube,
  Settings,
  MapPin,
  BookOpen,
  Plus,
  Trash2,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Shield,
  SkipForward,
} from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { AlertCircle, Loader2, User, ArrowRight, KeyRound } from 'lucide-react';
import { useSurveyForm } from '../context/SurveyFormContext';
import { motion, AnimatePresence } from 'framer-motion';

const AuthBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  const [testResults, setTestResults] = React.useState<string[]>([]);
  const [testData, setTestData] = React.useState({
    name: 'Test User',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    mobile: '+1234567890',
    otp: '123456',
  });
  const [isTestingFlow, setIsTestingFlow] = React.useState(false);

  const handleChange = (field: string, value: any) => {
    if (!onUpdate) return;
    onUpdate({
      ...data,
      [field]: value,
    });
  };

  // Fixed mapping change handler - never auto-delete, only manual delete
  const handleMappingChange = (
    oldPath: string,
    newPath: string,
    formField: string
  ) => {
    const fieldMappings = {
      ...((data.fieldMappings as Record<string, string>) || {}),
    };

    // Remove old key if it's different from new key
    if (oldPath !== newPath && oldPath in fieldMappings) {
      delete fieldMappings[oldPath];
    }

    // Always set the new value, regardless of whether key or value is empty
    fieldMappings[newPath] = formField;

    handleChange('fieldMappings', fieldMappings);
  };

  const addMapping = () => {
    const fieldMappings = {
      ...((data.fieldMappings as Record<string, string>) || {}),
    };
    // Use a simple incrementing counter for new entries
    let counter = 1;
    while (fieldMappings[`new_mapping_${counter}`] !== undefined) {
      counter++;
    }
    fieldMappings[`new_mapping_${counter}`] = '';
    handleChange('fieldMappings', fieldMappings);
  };

  const removeMapping = (path: string) => {
    const fieldMappings = {
      ...((data.fieldMappings as Record<string, string>) || {}),
    };
    delete fieldMappings[path];
    handleChange('fieldMappings', fieldMappings);
  };

  // Fixed header change handler - never auto-delete, only manual delete
  const handleHeaderChange = (
    oldKey: string,
    newKey: string,
    value: string
  ) => {
    const customHeaders = {
      ...((data.customHeaders as Record<string, string>) || {}),
    };

    // Remove old key if it's different from new key
    if (oldKey !== newKey && oldKey in customHeaders) {
      delete customHeaders[oldKey];
    }

    // Always set the new value, regardless of whether key or value is empty
    customHeaders[newKey] = value;

    handleChange('customHeaders', customHeaders);
  };

  const addHeader = () => {
    const customHeaders = {
      ...((data.customHeaders as Record<string, string>) || {}),
    };
    // Use a simple incrementing counter for new entries
    let counter = 1;
    while (customHeaders[`new_header_${counter}`] !== undefined) {
      counter++;
    }
    customHeaders[`new_header_${counter}`] = '';
    handleChange('customHeaders', customHeaders);
  };

  const removeHeader = (key: string) => {
    const customHeaders = {
      ...((data.customHeaders as Record<string, string>) || {}),
    };
    delete customHeaders[key];
    handleChange('customHeaders', customHeaders);
  };

  // Fixed body param change handler - never auto-delete, only manual delete
  const handleBodyParamChange = (
    oldKey: string,
    newKey: string,
    value: string
  ) => {
    const additionalBodyParams = {
      ...((data.additionalBodyParams as Record<string, string>) || {}),
    };

    // Remove old key if it's different from new key
    if (oldKey !== newKey && oldKey in additionalBodyParams) {
      delete additionalBodyParams[oldKey];
    }

    // Always set the new value, regardless of whether key or value is empty
    additionalBodyParams[newKey] = value;

    handleChange('additionalBodyParams', additionalBodyParams);
  };

  const addBodyParam = () => {
    const additionalBodyParams = {
      ...((data.additionalBodyParams as Record<string, string>) || {}),
    };
    // Use a simple incrementing counter for new entries
    let counter = 1;
    while (additionalBodyParams[`new_param_${counter}`] !== undefined) {
      counter++;
    }
    additionalBodyParams[`new_param_${counter}`] = '';
    handleChange('additionalBodyParams', additionalBodyParams);
  };

  const removeBodyParam = (key: string) => {
    const additionalBodyParams = {
      ...((data.additionalBodyParams as Record<string, string>) || {}),
    };
    delete additionalBodyParams[key];
    handleChange('additionalBodyParams', additionalBodyParams);
  };

  const getNestedValue = (obj: any, path: string) => {
    if (!path || !obj) return undefined;
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Validation helper
  const getValidationErrors = () => {
    const errors: string[] = [];

    if (!data.requireEmail && !data.requireMobile) {
      errors.push(
        'Either email or mobile must be enabled for authentication to work'
      );
    }

    if (!data.loginUrl && !data.signupUrl) {
      errors.push(
        'At least one authentication URL (login or signup) is required'
      );
    }

    if (data.useOtp) {
      if (
        data.requireEmail &&
        (!data.sendEmailOtpUrl || !data.verifyEmailOtpUrl)
      ) {
        errors.push(
          'Email OTP URLs are required when email is enabled with OTP'
        );
      }
      if (
        data.requireMobile &&
        (!data.sendMobileOtpUrl || !data.verifyMobileOtpUrl)
      ) {
        errors.push(
          'Mobile OTP URLs are required when mobile is enabled with OTP'
        );
      }
    }

    return errors;
  };

  const validationErrors = getValidationErrors();

  const testEndpoints = async () => {
    const endpoints = [
      { label: 'loginUrl', url: data.loginUrl },
      { label: 'signupUrl', url: data.signupUrl },
      { label: 'sendEmailOtpUrl', url: data.sendEmailOtpUrl },
      { label: 'verifyEmailOtpUrl', url: data.verifyEmailOtpUrl },
      { label: 'sendMobileOtpUrl', url: data.sendMobileOtpUrl },
      { label: 'verifyMobileOtpUrl', url: data.verifyMobileOtpUrl },
      { label: 'validateTokenUrl', url: data.validateTokenUrl },
    ];

    const results: string[] = [];
    for (const ep of endpoints) {
      if (!ep.url) continue;
      try {
        const res = await fetch(ep.url, { method: 'OPTIONS' });
        results.push(
          `${ep.label}: ${res.ok ? '✅ reachable' : `❌ ${res.status}`}`
        );
      } catch {
        results.push(`${ep.label}: ❌ error`);
      }
    }
    setTestResults(results.length ? results : ['No URLs configured']);
  };

  const testAuthFlow = async () => {
    setIsTestingFlow(true);
    const results: string[] = [];

    try {
      // Test the step-by-step flow
      results.push('🚀 Testing step-by-step authentication flow...\n');

      // Build headers with custom headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      const customHeaders =
        (data.customHeaders as Record<string, string>) || {};
      Object.entries(customHeaders).forEach(([key, value]) => {
        if (key && value && key.trim() && value.trim()) {
          headers[key] = value;
        }
      });

      results.push(`🔧 Request headers: ${JSON.stringify(headers, null, 2)}\n`);

      // Step 1: Prepare request body with additional parameters
      const baseRequestBody: any = {};
      if (data.requireName) baseRequestBody.name = testData.name;
      if (data.requireEmail) baseRequestBody.email = testData.email;
      if (data.requireMobile) baseRequestBody.mobile = testData.mobile;

      // Add additional body parameters
      const additionalParams =
        (data.additionalBodyParams as Record<string, string>) || {};
      Object.entries(additionalParams).forEach(([key, value]) => {
        if (key && value && key.trim() && value.trim()) {
          baseRequestBody[key] = value;
        }
      });

      results.push(
        `📋 Base request body: ${JSON.stringify(baseRequestBody, null, 2)}\n`
      );

      if (data.useOtp) {
        results.push('🔐 Testing OTP Flow...');

        // Test OTP flow
        if (data.requireEmail && data.sendEmailOtpUrl) {
          try {
            results.push('📧 Step 1: Sending email OTP...');
            const otpRes = await fetch(data.sendEmailOtpUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(baseRequestBody),
            });

            if (otpRes.ok) {
              const otpData = await otpRes.json();
              results.push(`✅ Email OTP sent successfully`);
              results.push(
                `📧 Response: ${JSON.stringify(otpData, null, 2)}\n`
              );

              // Test email OTP verification
              if (data.verifyEmailOtpUrl) {
                results.push('🔍 Step 2: Verifying email OTP...');
                const verifyBody = {
                  ...baseRequestBody,
                  email: testData.email,
                  otp: testData.otp,
                };
                const verifyRes = await fetch(data.verifyEmailOtpUrl, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(verifyBody),
                });

                if (verifyRes.ok) {
                  const verifyData = await verifyRes.json();
                  results.push(`✅ Email OTP verification successful`);
                  results.push(
                    `🔐 Auth response: ${JSON.stringify(verifyData, null, 2)}\n`
                  );

                  // Test field mapping
                  if (
                    data.fieldMappings &&
                    Object.keys(data.fieldMappings).length > 0
                  ) {
                    results.push(`🗺️ Testing field mappings:`);
                    Object.entries(
                      data.fieldMappings as Record<string, string>
                    ).forEach(([apiPath, formField]) => {
                      const value = getNestedValue(verifyData, apiPath);
                      results.push(`  ${apiPath} → ${formField}: ${value}`);
                    });
                    results.push('');
                  }

                  // Test token validation if configured
                  const tokenField = data.tokenField || 'token';
                  const token = verifyData[tokenField];
                  if (token && data.validateTokenUrl) {
                    results.push('🔄 Step 3: Validating token...');
                    const validateBody = {
                      ...baseRequestBody,
                      [tokenField]: token,
                    };
                    const validateRes = await fetch(data.validateTokenUrl, {
                      method: 'POST',
                      headers,
                      body: JSON.stringify(validateBody),
                    });

                    if (validateRes.ok) {
                      const validateData = await validateRes.json();
                      results.push(`✅ Token validation successful`);
                      results.push(
                        `👤 User data: ${JSON.stringify(validateData, null, 2)}`
                      );
                    } else {
                      results.push(
                        `❌ Token validation failed: ${validateRes.status}`
                      );
                    }
                  }
                } else {
                  const errorData = await verifyRes.text();
                  results.push(
                    `❌ Email OTP verification failed: ${verifyRes.status}`
                  );
                  results.push(`Error: ${errorData}`);
                }
              }
            } else {
              const errorData = await otpRes.text();
              results.push(`❌ Email OTP sending failed: ${otpRes.status}`);
              results.push(`Error: ${errorData}`);
            }
          } catch (error) {
            results.push(`❌ Email OTP flow error: ${error.message}`);
          }
        }

        if (data.requireMobile && data.sendMobileOtpUrl) {
          try {
            results.push('📱 Testing mobile OTP flow...');
            const otpRes = await fetch(data.sendMobileOtpUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(baseRequestBody),
            });

            if (otpRes.ok) {
              const otpData = await otpRes.json();
              results.push(`✅ Mobile OTP sent successfully`);
              results.push(
                `📱 Response: ${JSON.stringify(otpData, null, 2)}\n`
              );

              // Test mobile OTP verification
              if (data.verifyMobileOtpUrl) {
                results.push('🔍 Verifying mobile OTP...');
                const verifyBody = {
                  ...baseRequestBody,
                  mobile: testData.mobile,
                  otp: testData.otp,
                };
                const verifyRes = await fetch(data.verifyMobileOtpUrl, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(verifyBody),
                });

                if (verifyRes.ok) {
                  const verifyData = await verifyRes.json();
                  results.push(`✅ Mobile OTP verification successful`);
                  results.push(
                    `🔐 Auth response: ${JSON.stringify(verifyData, null, 2)}`
                  );
                } else {
                  results.push(
                    `❌ Mobile OTP verification failed: ${verifyRes.status}`
                  );
                }
              }
            } else {
              results.push(`❌ Mobile OTP sending failed: ${otpRes.status}`);
            }
          } catch (error) {
            results.push(`❌ Mobile OTP flow error: ${error.message}`);
          }
        }
      } else {
        results.push('🔓 Testing Direct Authentication Flow...');

        // Test direct login
        if (data.loginUrl) {
          try {
            results.push('🔑 Testing login endpoint...');
            const loginRes = await fetch(data.loginUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(baseRequestBody),
            });

            if (loginRes.ok) {
              const loginData = await loginRes.json();
              results.push(`✅ Direct login successful`);
              results.push(
                `🔐 Auth response: ${JSON.stringify(loginData, null, 2)}\n`
              );

              // Test token validation if configured
              const tokenField = data.tokenField || 'token';
              const token = loginData[tokenField];

              if (token && data.validateTokenUrl) {
                results.push('🔄 Testing token validation...');
                const validateBody = {
                  ...baseRequestBody,
                  [tokenField]: token,
                };
                const validateRes = await fetch(data.validateTokenUrl, {
                  method: 'POST',
                  headers,
                  body: JSON.stringify(validateBody),
                });

                if (validateRes.ok) {
                  const validateData = await validateRes.json();
                  results.push(`✅ Token validation successful`);
                  results.push(
                    `👤 User data: ${JSON.stringify(validateData, null, 2)}`
                  );
                } else {
                  results.push(
                    `❌ Token validation failed: ${validateRes.status}`
                  );
                }
              }

              // Test field mapping
              if (
                data.fieldMappings &&
                Object.keys(data.fieldMappings).length > 0
              ) {
                results.push(`🗺️ Testing field mappings:`);
                Object.entries(
                  data.fieldMappings as Record<string, string>
                ).forEach(([apiPath, formField]) => {
                  const value = getNestedValue(loginData, apiPath);
                  results.push(`  ${apiPath} → ${formField}: ${value}`);
                });
              }
            } else {
              const errorData = await loginRes.text();
              results.push(`❌ Direct login failed: ${loginRes.status}`);
              results.push(`Error: ${errorData}`);
            }
          } catch (error) {
            results.push(`❌ Direct login error: ${error.message}`);
          }
        }
      }

      results.push('\n🎉 Flow testing completed!');
    } catch (error) {
      results.push(`❌ Flow test error: ${error.message}`);
    }

    setTestResults(results);
    setIsTestingFlow(false);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Authentication Block Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  {validationErrors.map((error, index) => (
                    <div key={index}>• {error}</div>
                  ))}
                </div>
              </AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="config" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="config">Configuration</TabsTrigger>
              <TabsTrigger value="parameters">Parameters</TabsTrigger>
              <TabsTrigger value="mapping">Data Mapping</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="docs">API Docs</TabsTrigger>
            </TabsList>

            <TabsContent value="config" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Basic Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Skip if Logged In Option */}
                  <Card className="p-4 border-blue-200">
                    <div className="flex items-center space-x-2 mb-3">
                      <Checkbox
                        id="skipIfLoggedIn"
                        checked={!!data.skipIfLoggedIn}
                        onCheckedChange={(checked) =>
                          handleChange('skipIfLoggedIn', !!checked)
                        }
                      />
                      <Label
                        htmlFor="skipIfLoggedIn"
                        className="text-sm flex items-center gap-2"
                      >
                        <SkipForward className="w-4 h-4" />
                        Skip if Already Logged In
                      </Label>
                    </div>
                    <p className="text-sm text-blue-800">
                      When enabled, this authentication block will be
                      automatically skipped if a valid authentication token is
                      found in storage. This is useful for multi-step forms
                      where users might navigate back and forth.
                    </p>
                    {data.skipIfLoggedIn && (
                      <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-700">
                        <strong>Note:</strong> The block will only be skipped if
                        both a valid token exists and
                        {data.validateTokenUrl
                          ? ' the token validation passes.'
                          : ' no token validation URL is configured.'}
                      </div>
                    )}
                  </Card>

                  {/* Authentication URLs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="loginUrl">
                        Login URL
                      </Label>
                      <Input
                        id="loginUrl"
                        value={data.loginUrl || ''}
                        onChange={(e) =>
                          handleChange('loginUrl', e.target.value)
                        }
                        placeholder="https://api.example.com/login"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="signupUrl">
                        Signup URL (Optional)
                      </Label>
                      <Input
                        id="signupUrl"
                        value={data.signupUrl || ''}
                        onChange={(e) =>
                          handleChange('signupUrl', e.target.value)
                        }
                        placeholder="https://api.example.com/signup"
                      />
                    </div>
                  </div>

                  {/* Token Settings */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="tokenField">
                        Token Field Name
                      </Label>
                      <Input
                        id="tokenField"
                        value={data.tokenField || 'token'}
                        onChange={(e) =>
                          handleChange('tokenField', e.target.value)
                        }
                        placeholder="token"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="tokenStorageKey">
                        Token Storage Key
                      </Label>
                      <Input
                        id="tokenStorageKey"
                        value={data.tokenStorageKey || 'authToken'}
                        onChange={(e) =>
                          handleChange('tokenStorageKey', e.target.value)
                        }
                        placeholder="authToken"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm" htmlFor="validateTokenUrl">
                      Token Validation URL (Optional)
                    </Label>
                    <Input
                      id="validateTokenUrl"
                      value={data.validateTokenUrl || ''}
                      onChange={(e) =>
                        handleChange('validateTokenUrl', e.target.value)
                      }
                      placeholder="https://api.example.com/validate-token"
                    />
                    <p className="text-xs text-muted-foreground">
                      Used to validate existing tokens when users return
                      {data.skipIfLoggedIn
                        ? ' and when skip if logged in is enabled'
                        : ''}
                    </p>
                  </div>

                  {/* Required Fields */}
                  <Card className="p-4 bg-muted/50">
                    <h4 className="font-medium mb-3">Required Fields</h4>
                    <div className="space-y-4">
                      {/* Name Configuration */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="requireName"
                            checked={!!data.requireName}
                            onCheckedChange={(checked) =>
                              handleChange('requireName', !!checked)
                            }
                          />
                          <Label className="text-sm" htmlFor="requireName">
                            Require Name
                          </Label>
                        </div>

                        {data.requireName && (
                          <div className="ml-6 space-y-2">
                            <Label className="text-sm">Name Field Type</Label>
                            <Select
                              value={data.nameFieldType || 'separate'}
                              onValueChange={(value) =>
                                handleChange('nameFieldType', value)
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="single">
                                  Single Name Field
                                </SelectItem>
                                <SelectItem value="separate">
                                  Separate First & Last Name
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Email and Mobile checkboxes */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="requireEmail"
                            checked={!!data.requireEmail}
                            onCheckedChange={(checked) =>
                              handleChange('requireEmail', !!checked)
                            }
                          />
                          <Label className="text-sm" htmlFor="requireEmail">
                            Require Email
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="requireMobile"
                            checked={!!data.requireMobile}
                            onCheckedChange={(checked) =>
                              handleChange('requireMobile', !!checked)
                            }
                          />
                          <Label className="text-sm" htmlFor="requireMobile">
                            Require Mobile
                          </Label>
                        </div>
                      </div>
                    </div>

                    {!data.requireEmail && !data.requireMobile && (
                      <Alert className="mt-3">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          At least one of Email or Mobile must be enabled for
                          authentication to work
                        </AlertDescription>
                      </Alert>
                    )}
                  </Card>

                  {/* Field Labels */}
                  <div className="grid grid-cols-2 gap-4">
                    {data.nameFieldType === 'single' ? (
                      <div className="space-y-2">
                        <Label className="text-sm" htmlFor="nameLabel">
                          Name Field Label
                        </Label>
                        <Input
                          id="nameLabel"
                          value={data.nameLabel || 'Full Name'}
                          onChange={(e) =>
                            handleChange('nameLabel', e.target.value)
                          }
                          placeholder="Name"
                        />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm" htmlFor="firstNameLabel">
                            First Name Label
                          </Label>
                          <Input
                            id="firstNameLabel"
                            value={data.firstNameLabel || 'First Name'}
                            onChange={(e) =>
                              handleChange('firstNameLabel', e.target.value)
                            }
                            placeholder="First Name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm" htmlFor="lastNameLabel">
                            Last Name Label
                          </Label>
                          <Input
                            id="lastNameLabel"
                            value={data.lastNameLabel || 'Last Name'}
                            onChange={(e) =>
                              handleChange('lastNameLabel', e.target.value)
                            }
                            placeholder="Last Name"
                          />
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="emailLabel">
                        Email Field Label
                      </Label>
                      <Input
                        id="emailLabel"
                        value={data.emailLabel || 'Email'}
                        onChange={(e) =>
                          handleChange('emailLabel', e.target.value)
                        }
                        placeholder="Email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="mobileLabel">
                        Mobile Field Label
                      </Label>
                      <Input
                        id="mobileLabel"
                        value={data.mobileLabel || 'Mobile Number'}
                        onChange={(e) =>
                          handleChange('mobileLabel', e.target.value)
                        }
                        placeholder="Mobile Number"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* OTP Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    OTP Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="useOtp"
                      checked={!!data.useOtp}
                      onCheckedChange={(checked) =>
                        handleChange('useOtp', !!checked)
                      }
                    />
                    <Label className="text-sm" htmlFor="useOtp">
                      Enable OTP Authentication
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When enabled, users will receive verification codes instead
                    of direct login
                  </p>

                  {data.useOtp && (
                    <div className="space-y-4 p-4 rounded-lg">
                      {data.requireEmail && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              className="text-sm"
                              htmlFor="sendEmailOtpUrl"
                            >
                              Send Email OTP URL
                            </Label>
                            <Input
                              id="sendEmailOtpUrl"
                              value={data.sendEmailOtpUrl || ''}
                              onChange={(e) =>
                                handleChange('sendEmailOtpUrl', e.target.value)
                              }
                              placeholder="https://api.example.com/send-email-otp"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              className="text-sm"
                              htmlFor="verifyEmailOtpUrl"
                            >
                              Verify Email OTP URL
                            </Label>
                            <Input
                              id="verifyEmailOtpUrl"
                              value={data.verifyEmailOtpUrl || ''}
                              onChange={(e) =>
                                handleChange(
                                  'verifyEmailOtpUrl',
                                  e.target.value
                                )
                              }
                              placeholder="https://api.example.com/verify-email-otp"
                            />
                          </div>
                        </div>
                      )}

                      {data.requireMobile && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label
                              className="text-sm"
                              htmlFor="sendMobileOtpUrl"
                            >
                              Send Mobile OTP URL
                            </Label>
                            <Input
                              id="sendMobileOtpUrl"
                              value={data.sendMobileOtpUrl || ''}
                              onChange={(e) =>
                                handleChange('sendMobileOtpUrl', e.target.value)
                              }
                              placeholder="https://api.example.com/send-mobile-otp"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label
                              className="text-sm"
                              htmlFor="verifyMobileOtpUrl"
                            >
                              Verify Mobile OTP URL
                            </Label>
                            <Input
                              id="verifyMobileOtpUrl"
                              value={data.verifyMobileOtpUrl || ''}
                              onChange={(e) =>
                                handleChange(
                                  'verifyMobileOtpUrl',
                                  e.target.value
                                )
                              }
                              placeholder="https://api.example.com/verify-mobile-otp"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="parameters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Custom Headers
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Add custom headers to all API requests (e.g., X-Merchant-ID,
                    Authorization, API-Key).
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(
                    (data.customHeaders as Record<string, string>) || {}
                  ).map(([headerKey, headerValue], index) => (
                    <div
                      key={index}
                      className="grid grid-cols-5 gap-2 items-end"
                    >
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Header Name</Label>
                        <Input
                          value={headerKey}
                          onChange={(e) =>
                            handleHeaderChange(
                              headerKey,
                              e.target.value,
                              headerValue
                            )
                          }
                          placeholder="X-Merchant-ID"
                          className="text-sm"
                        />
                      </div>
                      <div className="text-center text-muted-foreground">:</div>
                      <div className="space-y-1">
                        <Label className="text-xs">Header Value</Label>
                        <Input
                          value={headerValue}
                          onChange={(e) =>
                            handleHeaderChange(
                              headerKey,
                              headerKey,
                              e.target.value
                            )
                          }
                          placeholder="123"
                          className="text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeHeader(headerKey)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addHeader}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Header
                  </Button>

                  <div className="p-3 rounded text-sm">
                    <strong>Common headers:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>
                        • <code>X-Merchant-ID</code> → <code>123</code> (for
                        merchant identification)
                      </li>
                      <li>
                        • <code>Authorization</code> →{' '}
                        <code>Bearer your-api-key</code> (for API
                        authentication)
                      </li>
                      <li>
                        • <code>X-API-Key</code> → <code>your-api-key</code>{' '}
                        (for API key authentication)
                      </li>
                      <li>
                        • <code>X-Client-Version</code> → <code>1.0.0</code>{' '}
                        (for client version tracking)
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Additional Body Parameters
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Add additional parameters to the request body for all API
                    calls.
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(
                    (data.additionalBodyParams as Record<string, string>) || {}
                  ).map(([paramKey, paramValue], index) => (
                    <div
                      key={index}
                      className="grid grid-cols-5 gap-2 items-end"
                    >
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">Parameter Name</Label>
                        <Input
                          value={paramKey}
                          onChange={(e) =>
                            handleBodyParamChange(
                              paramKey,
                              e.target.value,
                              paramValue
                            )
                          }
                          placeholder="merchant_id"
                          className="text-sm"
                        />
                      </div>
                      <div className="text-center text-muted-foreground">:</div>
                      <div className="space-y-1">
                        <Label className="text-xs">Parameter Value</Label>
                        <Input
                          value={paramValue}
                          onChange={(e) =>
                            handleBodyParamChange(
                              paramKey,
                              paramKey,
                              e.target.value
                            )
                          }
                          placeholder="123"
                          className="text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeBodyParam(paramKey)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={addBodyParam}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Parameter
                  </Button>

                  <div className="p-3 rounded text-sm">
                    <strong>Common parameters:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>
                        • <code>merchant_id</code> → <code>123</code> (for
                        merchant identification)
                      </li>
                      <li>
                        • <code>source</code> → <code>web</code> (for request
                        source tracking)
                      </li>
                      <li>
                        • <code>app_version</code> → <code>1.0.0</code> (for app
                        version tracking)
                      </li>
                      <li>
                        • <code>locale</code> → <code>en_US</code> (for
                        localization)
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="mapping" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    API Response Data Mapping
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Map fields from your API response to form values. Use dot
                    notation for nested values (e.g., "user.department").
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {Object.entries(
                    (data.fieldMappings as Record<string, string>) || {}
                  ).map(([apiPath, formField], index) => (
                    <div
                      key={index}
                      className="grid grid-cols-5 gap-2 items-end"
                    >
                      <div className="col-span-2 space-y-1">
                        <Label className="text-xs">API Response Path</Label>
                        <Input
                          value={apiPath}
                          onChange={(e) =>
                            handleMappingChange(
                              apiPath,
                              e.target.value,
                              formField
                            )
                          }
                          placeholder="user.department"
                          className="text-sm"
                        />
                      </div>
                      <div className="text-center text-muted-foreground">→</div>
                      <div className="space-y-1">
                        <Label className="text-xs">Form Field</Label>
                        <Input
                          value={formField}
                          onChange={(e) =>
                            handleMappingChange(
                              apiPath,
                              apiPath,
                              e.target.value
                            )
                          }
                          placeholder="department"
                          className="text-sm"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeMapping(apiPath)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}

                  <Button type="button" variant="outline" onClick={addMapping}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Mapping
                  </Button>

                  <div className="p-3 rounded text-sm">
                    <strong>Example mappings:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>
                        • <code>user.id</code> → <code>userId</code>
                      </li>
                      <li>
                        • <code>user.department</code> → <code>department</code>
                      </li>
                      <li>
                        • <code>subscription.tier</code> → <code>userTier</code>
                      </li>
                      <li>
                        • <code>metadata.role</code> → <code>userRole</code>
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testing" className="space-y-4">
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TestTube className="w-4 h-4" />
                    API Testing
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-4 gap-4">
                    {data.nameFieldType === 'separate' ? (
                      <>
                        <div className="space-y-2">
                          <Label className="text-sm" htmlFor="testFirstName">
                            Test First Name
                          </Label>
                          <Input
                            id="testFirstName"
                            value={testData.firstName}
                            onChange={(e) =>
                              setTestData((prev) => ({
                                ...prev,
                                firstName: e.target.value,
                              }))
                            }
                            placeholder="Test"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm" htmlFor="testLastName">
                            Test Last Name
                          </Label>
                          <Input
                            id="testLastName"
                            value={testData.lastName}
                            onChange={(e) =>
                              setTestData((prev) => ({
                                ...prev,
                                lastName: e.target.value,
                              }))
                            }
                            placeholder="User"
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-2">
                        <Label className="text-sm" htmlFor="testName">
                          Test Name
                        </Label>
                        <Input
                          id="testName"
                          value={testData.name}
                          onChange={(e) =>
                            setTestData((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Test User"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="testEmail">
                        Test Email
                      </Label>
                      <Input
                        id="testEmail"
                        value={testData.email}
                        onChange={(e) =>
                          setTestData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        placeholder="test@example.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="testMobile">
                        Test Mobile
                      </Label>
                      <Input
                        id="testMobile"
                        value={testData.mobile}
                        onChange={(e) =>
                          setTestData((prev) => ({
                            ...prev,
                            mobile: e.target.value,
                          }))
                        }
                        placeholder="+1234567890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm" htmlFor="testOtp">
                        Test OTP
                      </Label>
                      <Input
                        id="testOtp"
                        value={testData.otp}
                        onChange={(e) =>
                          setTestData((prev) => ({
                            ...prev,
                            otp: e.target.value,
                          }))
                        }
                        placeholder="123456"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={testEndpoints}
                    >
                      Test Endpoint Reachability
                    </Button>
                    <Button
                      type="button"
                      variant="default"
                      onClick={testAuthFlow}
                      disabled={isTestingFlow || validationErrors.length > 0}
                    >
                      {isTestingFlow ? 'Testing...' : 'Test Complete Auth Flow'}
                    </Button>
                  </div>

                  {validationErrors.length > 0 && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        Please fix the configuration errors above before
                        testing.
                      </AlertDescription>
                    </Alert>
                  )}

                  {testResults.length > 0 && (
                    <div className="p-4 ounded">
                      <h4 className="font-medium mb-2">Test Results:</h4>
                      <pre className="text-sm whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                        {testResults.join('\n')}
                      </pre>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="docs" className="space-y-4">
              <Card className="max-w-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    API Documentation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="prose prose-sm max-w-none">
                    <h3>Authentication Flow Overview</h3>

                    <div className="p-4 rounded-lg">
                      <h4 className="text-blue-800 font-medium">
                        Step-by-Step User Experience:
                      </h4>
                      <ol className="text-blue-700 mt-2 space-y-1">
                        <li>1. User enters name (if required)</li>
                        <li>2. User enters email (if required)</li>
                        <li>3. User enters mobile (if required)</li>
                        <li>
                          4a. If OTP enabled: User receives and enters
                          verification code
                        </li>
                        <li>
                          4b. If OTP disabled: Direct authentication occurs
                        </li>
                        <li>5. User is authenticated and can continue</li>
                      </ol>
                    </div>

                    {data.skipIfLoggedIn && (
                      <div className="p-4 rounded-lg">
                        <h4 className="text-green-800 font-medium">
                          Skip if Logged In Behavior:
                        </h4>
                        <ul className="text-green-700 mt-2 space-y-1">
                          <li>
                            • If a valid token exists in storage, this block
                            will be automatically skipped
                          </li>
                          <li>
                            • If a validation URL is configured, the token will
                            be validated before skipping
                          </li>
                          <li>
                            • Users can still manually navigate back to this
                            block to sign in as a different user
                          </li>
                          <li>
                            • Forward navigation from this block will skip it
                            again if still logged in
                          </li>
                        </ul>
                      </div>
                    )}

                    <h4>1. Direct Authentication (OTP Disabled)</h4>
                    <div className="p-3 rounded text-sm">
                      <strong>Login/Signup Request:</strong>
                      <pre className="mt-2 bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                        {`POST /api/login
Content-Type: application/json

{
  "email": "user@example.com", // if requireEmail is true
  "mobile": "+1234567890", // if requireMobile is true
  "name": "John Doe" // if requireName is true
}`}
                      </pre>
                    </div>

                    <div className="p-3 rounded text-sm">
                      <strong>Success Response:</strong>
                      <pre className="mt-2 bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                        {`{
  "token": "jwt_token_here",
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "mobile": "+1234567890", 
    "name": "John Doe",
    // ... other user data
  },
  "success": true
}`}
                      </pre>
                    </div>

                    <h4>2. OTP Authentication Flow</h4>

                    <div className="p-3 rounded text-sm">
                      <strong>Send OTP Request:</strong>
                      <pre className="mt-2 bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                        {`POST /api/send-email-otp  // or /api/send-mobile-otp
Content-Type: application/json
X-Merchant-ID: 123

{
  "email": "user@example.com",     // for email OTP
  "mobile": "+1234567890",         // for mobile OTP  
  "name": "John Doe",              // optional
  "merchant_id": "123",            // additional body param (if configured)
  "source": "web"                  // additional body param (if configured)
}`}
                      </pre>
                    </div>

                    <div className="p-3 rounded text-sm">
                      <strong>Verify OTP Request:</strong>
                      <pre className="mt-2 bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                        {`POST /api/verify-email-otp  // or /api/verify-mobile-otp
Content-Type: application/json
X-Merchant-ID: 123

{
  "email": "user@example.com",     // for email OTP
  "mobile": "+1234567890",         // for mobile OTP
  "otp": "123456",
  "merchant_id": "123",            // additional body param (if configured)
  "source": "web"                  // additional body param (if configured)
}`}
                      </pre>
                    </div>

                    <div className="p-3 rounded text-sm">
                      <strong>OTP Verification Success Response:</strong>
                      <pre className="mt-2 bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                        {`{
  "token": "jwt_token_here",
  "user": {
    "id": "user123",
    "email": "user@example.com",
    "mobile": "+1234567890",
    "name": "John Doe",
    // ... other user data
  },
  "success": true
}`}
                      </pre>
                    </div>

                    <h4>3. Token Validation (Optional)</h4>
                    <div className="p-3 rounded text-sm">
                      <strong>Request:</strong>
                      <pre className="mt-2 bg-gray-800 text-green-400 p-2 rounded overflow-x-auto">
                        {`POST /api/validate-token
Content-Type: application/json
X-Merchant-ID: 123

{
  "token": "jwt_token_here",
  "merchant_id": "123",            // additional body param (if configured)
  "source": "web"                  // additional body param (if configured)
}`}
                      </pre>
                    </div>

                    <h4>4. Error Response Format</h4>
                    <div className="p-3 rounded text-sm">
                      <strong>
                        All endpoints should return errors in this format:
                      </strong>
                      <pre className="mt-2 bg-gray-800 text-red-400 p-2 rounded overflow-x-auto">
                        {`{
  "success": false,
  "error": "Invalid credentials",
  "code": "AUTH_FAILED"
}`}
                      </pre>
                    </div>

                    <h4>5. Data Storage</h4>
                    <div className="p-3 rounded text-sm">
                      <p className="text-green-800">
                        The authentication data will be stored in the form
                        results under the field name you specified. The stored
                        data includes all user information, token, and mapped
                        fields from your API response.
                      </p>
                    </div>

                    <h4>6. Custom Headers & Body Parameters</h4>
                    <div className="p-3 rounded text-sm">
                      <p className="text-purple-800 mb-2">
                        <strong>Custom Headers:</strong> All configured custom
                        headers are sent with every API request. Common use
                        cases include merchant identification, API keys, and
                        version tracking.
                      </p>
                      <p className="text-purple-800">
                        <strong>Additional Body Parameters:</strong> These
                        parameters are automatically added to the request body
                        of all API calls, allowing you to send additional
                        context like merchant_id, source tracking, etc.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

const AuthBlockItem: React.FC<ContentBlockItemProps> = ({ data }) => {
  const validationErrors = [];
  if (!data.requireEmail && !data.requireMobile) {
    validationErrors.push('Either email or mobile must be enabled');
  }

  return (
    <div className="p-4 border rounded-md text-center text-sm">
      <UserCheck className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
      <div className="font-medium">Authentication Required</div>
      <div className="text-xs text-muted-foreground mt-1 space-y-1">
        {data.useOtp && (
          <div>
            OTP:{' '}
            {data.requireEmail && data.requireMobile
              ? 'Email & Mobile'
              : data.requireEmail
              ? 'Email'
              : 'Mobile'}
          </div>
        )}
        {data.skipIfLoggedIn && (
          <div className="text-blue-600 flex items-center justify-center gap-1">
            <SkipForward className="w-3 h-3" />
            Skip if logged in
          </div>
        )}
        {validationErrors.length > 0 && (
          <div className="text-red-500 flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            Configuration needed
          </div>
        )}
      </div>
    </div>
  );
};

const AuthBlockPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-1 text-sm">
      <UserCheck className="w-4 h-4 mr-2" /> Auth
    </div>
  );
};

type AuthStep =
  | 'name'
  | 'firstName'
  | 'email'
  | 'phone'
  | 'email-otp'
  | 'phone-otp'
  | 'welcome'
  | 'skipped';

const AuthRenderer: React.FC<BlockRendererProps> = ({ block }) => {
  const { goToNextBlock, setValue, navigationHistory } = useSurveyForm();

  // Block configuration
  const fieldName = (block as any).fieldName || 'authResults';
  const tokenField = (block as any).tokenField || 'token';
  const storageKey = (block as any).tokenStorageKey || 'authToken';
  const nameLabel = (block as any).nameLabel || 'Full Name';
  const emailLabel = (block as any).emailLabel || 'Email';
  const mobileLabel = (block as any).mobileLabel || 'Mobile Number';
  const useOtp = (block as any).useOtp || false;
  const requireName = (block as any).requireName || false;
  const requireEmail = (block as any).requireEmail || true;
  const requireMobile = (block as any).requireMobile || false;
  const skipIfLoggedIn = (block as any).skipIfLoggedIn || false; // New configuration

  // Add configuration for name field type:
  const nameFieldType = (block as any).nameFieldType || 'separate';
  const firstNameLabel = (block as any).firstNameLabel || 'First Name';
  const lastNameLabel = (block as any).lastNameLabel || 'Last Name';

  // Form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [currentStep, setCurrentStep] = useState<AuthStep>(
    nameFieldType == 'single' ? 'name' : 'firstName'
  );
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [mobileOtp, setMobileOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState<{ email?: boolean; mobile?: boolean }>(
    {}
  );
  const [isManualNavigation, setIsManualNavigation] = useState(false);

  // Track initial load vs navigation
  const hasInitialized = useRef(false);

  // Determine if this is a back navigation to this block
  const checkIfBackNavigation = () => {
    if (navigationHistory.length < 2) return false;

    const currentEntry = navigationHistory[navigationHistory.length - 1];
    const previousEntry = navigationHistory[navigationHistory.length - 2];

    // Check if this is back navigation by looking at the trigger
    return currentEntry && previousEntry && previousEntry.trigger === 'back';
  };

  // Check for existing authentication on mount
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const isBackNav = checkIfBackNavigation();
    setIsManualNavigation(isBackNav);

    try {
      const user = JSON.parse(localStorage.getItem(storageKey));
      if (user) {
        const existing = user[tokenField];
        if (existing) {
          setLoading(true);

          // If skip is enabled and this is not a manual back navigation,
          // and no validation URL is configured, skip immediately
          if (
            skipIfLoggedIn &&
            !isBackNav &&
            !(block as any).validateTokenUrl
          ) {
            // Auto-skip without validation
            setTimeout(() => {
              const authResults = {
                token: existing,
                isAuthenticated: true,
                timestamp: new Date().toISOString(),
                skipped: true,
                skipReason: 'Already logged in (no validation required)',
              };
              setValue(fieldName, user);
              setLoading(false);
              goToNextBlock();
            }, 200); // Small delay to show loading state
            return;
          }

          // If validation URL is configured, validate the token
          if ((block as any).validateTokenUrl) {
            const headers = buildRequestHeaders();
            const baseBody = { [tokenField]: existing };
            const requestBody = buildRequestBody(baseBody);

            fetch((block as any).validateTokenUrl, {
              method: 'POST',
              headers,
              body: JSON.stringify(requestBody),
            })
              .then((res) => (res.ok ? res.json() : Promise.reject()))
              .then((data) => {
                const processedData = applyFieldMappings(data);

                // If skip is enabled and this is not manual navigation, skip after successful validation
                if (!isBackNav) {
                  const authResults = {
                    ...processedData,
                    name: data?.name || '',
                    email: data?.email || '',
                    mobile: data?.mobile || '',
                    token: existing,
                    isAuthenticated: true,
                    timestamp: new Date().toISOString(),
                    skipped: true,
                    skipReason: 'Already logged in (validation passed)',
                  };
                  setValue(fieldName, data);
                  setLoading(false);
                  goToNextBlock();
                  return;
                }

                // Otherwise show welcome screen
                saveToFieldName(processedData, existing);
                setCurrentStep('welcome');
                if (data?.name) setName(data.name);
                if (data?.email) setEmail(data.email);
                if (data?.mobile) setMobile(data.mobile);
                setLoading(false);
              })
              .catch(() => {
                localStorage.removeItem(storageKey);
                determineFirstStep();
                setLoading(false);
              });
          } else {
            // No validation URL, show welcome screen if manual navigation or skip not enabled
            if (isBackNav || !skipIfLoggedIn) {
              setCurrentStep('welcome');
              setValue(fieldName, user);
              setLoading(false);
            }
            // If skip is enabled and not manual navigation, the earlier code already handled skipping
          }
        } else {
          determineFirstStep();
        }
      }
    } catch (e: any) {
      determineFirstStep();
    }
  }, []);

  // Handle when user navigates back to this block after being elsewhere
  useEffect(() => {
    if (!hasInitialized.current) return;

    const isBackNav = checkIfBackNavigation();
    if (isBackNav) {
      setIsManualNavigation(true);
      // If user manually navigated back and there's a token, show welcome screen
      const existing = localStorage.getItem(storageKey);
      if (existing && currentStep !== 'welcome') {
        setCurrentStep('welcome');
      }
    }
  }, [navigationHistory]);

  // Update determineFirstStep function:
  const determineFirstStep = () => {
    if (requireName) {
      if (nameFieldType === 'separate') {
        setCurrentStep('firstName');
      } else {
        setCurrentStep('name');
      }
    } else if (requireEmail) {
      setCurrentStep('email');
    } else if (requireMobile) {
      setCurrentStep('phone');
    } else {
      setCurrentStep('email'); // fallback
    }
  };

  const getNestedValue = (obj: any, path: string) => {
    if (!path || !obj) return undefined;
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  const applyFieldMappings = (responseData: any) => {
    const fieldMappings = (block as any).fieldMappings || {};
    const mappedData = { ...responseData };

    Object.entries(fieldMappings).forEach(([apiPath, formField]) => {
      const value = getNestedValue(responseData, apiPath);
      if (value !== undefined) {
        mappedData[formField as string] = value;
      }
    });

    return mappedData;
  };

  const saveToFieldName = (data: any, token?: string) => {
    const authResults = {
      ...data,
      name: nameFieldType === 'separate' ? `${firstName} ${lastName}` : name,
      firstName: nameFieldType === 'separate' ? firstName : undefined,
      lastName: nameFieldType === 'separate' ? lastName : undefined,
      email,
      mobile,
      token: token || data[tokenField],
      isAuthenticated: true,
      timestamp: new Date().toISOString(),
      skipped: false,
    };

    setValue(fieldName, authResults);
  };

  const handleStepSubmit = async () => {
    setError(null);
    setSuccess(null);

    // Handle step transitions

    if (currentStep === 'name') {
      if (!name.trim()) {
        setError('Name is required');
        return;
      }
      setCurrentStep(requireEmail ? 'email' : 'phone');
      return;
    }

    if (currentStep === 'firstName') {
      if (!firstName.trim()) {
        setError('First name is required');
        return;
      }
      if (!lastName.trim()) {
        setError('Last name is required');
        return;
      }
      setCurrentStep(requireEmail ? 'email' : 'phone');
      return;
    }

    if (currentStep === 'email') {
      if (!email.trim()) {
        setError('Email is required');
        return;
      }
      if (requireMobile) {
        setCurrentStep('phone');
        return;
      }
      // Proceed to authentication
      await handleAuthentication();
      return;
    }

    if (currentStep === 'phone') {
      if (!mobile.trim()) {
        setError('Mobile number is required');
        return;
      }
      // Proceed to authentication
      await handleAuthentication();
      return;
    }

    if (currentStep === 'email-otp') {
      await handleOtpVerification('email');
      return;
    }

    if (currentStep === 'phone-otp') {
      await handleOtpVerification('mobile');
      return;
    }
  };

  const buildRequestHeaders = () => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add custom headers from block configuration
    const customHeaders = (block as any).customHeaders || {};
    Object.entries(customHeaders).forEach(([key, value]) => {
      if (key && value) {
        headers[key] = value as string;
      }
    });

    return headers;
  };

  const buildRequestBody = (baseBody: Record<string, any>) => {
    const requestBody = { ...baseBody };

    // Add additional body parameters from block configuration
    const additionalParams = (block as any).additionalBodyParams || {};
    Object.entries(additionalParams).forEach(([key, value]) => {
      if (key && value) {
        requestBody[key] = value;
      }
    });

    return requestBody;
  };

  const handleAuthentication = async () => {
    setLoading(true);

    try {
      const baseBody: any = {};
      if (requireName) {
        if (nameFieldType === 'separate') {
          baseBody.firstName = firstName;
          baseBody.lastName = lastName;
          baseBody.name = `${firstName} ${lastName}`; // Also send combined name
        } else {
          baseBody.name = name;
        }
      }
      if (requireEmail && email) baseBody.email = email;
      if (requireMobile && mobile) baseBody.mobile = mobile;

      const headers = buildRequestHeaders();

      if (useOtp) {
        // Send OTP based on what's enabled
        if (requireEmail && (block as any).sendEmailOtpUrl) {
          const requestBody = buildRequestBody(baseBody);
          const otpRes = await fetch((block as any).sendEmailOtpUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
          });

          if (otpRes.ok) {
            setOtpSent((prev) => ({ ...prev, email: true }));
            setSuccess('OTP sent to your email');
            setCurrentStep('email-otp');
          } else {
            const errorData = await otpRes.json();
            throw new Error(errorData.error || 'Failed to send email OTP');
          }
        } else if (requireMobile && (block as any).sendMobileOtpUrl) {
          const requestBody = buildRequestBody(baseBody);
          const otpRes = await fetch((block as any).sendMobileOtpUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(requestBody),
          });

          if (otpRes.ok) {
            setOtpSent((prev) => ({ ...prev, mobile: true }));
            setSuccess('OTP sent to your mobile');
            setCurrentStep('phone-otp');
          } else {
            const errorData = await otpRes.json();
            throw new Error(errorData.error || 'Failed to send mobile OTP');
          }
        }
      } else {
        // Direct login/signup
        const url = (block as any).loginUrl || (block as any).signupUrl;
        const requestBody = buildRequestBody(baseBody);
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        const data = await res.json();

        if (res.ok) {
          const processedData = applyFieldMappings(data);

          if (data[tokenField]) {
            localStorage.setItem(storageKey, JSON.stringify(data));
          }

          const authResults = {
            ...processedData,
            name:
              nameFieldType === 'separate' ? `${firstName} ${lastName}` : name,
            firstName: nameFieldType === 'separate' ? firstName : undefined,
            lastName: nameFieldType === 'separate' ? lastName : undefined,
            email,
            mobile,
            token: data[tokenField],
            isAuthenticated: true,
            timestamp: new Date().toISOString(),
            skipped: false,
          };

          await new Promise((f) => setTimeout(f, 1000));
          goToNextBlock({ [fieldName]: authResults });
        } else {
          throw new Error(data.error || 'Authentication failed');
        }
      }
    } catch (e: any) {
      setError(e.message || 'Authentication failed');
    }

    setLoading(false);
  };

  const handleOtpVerification = async (type: 'email' | 'mobile') => {
    setLoading(true);
    setError(null);

    try {
      const otp = type === 'email' ? emailOtp : mobileOtp;
      const verifyUrl =
        type === 'email'
          ? (block as any).verifyEmailOtpUrl
          : (block as any).verifyMobileOtpUrl;

      const baseBody =
        type === 'email' ? { name, email, otp } : { name, mobile, otp };

      const headers = buildRequestHeaders();
      const requestBody = buildRequestBody(baseBody);

      const res = await fetch(verifyUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const data = await res.json();

      if (res.ok) {
        const processedData = applyFieldMappings(data);

        if (data[tokenField]) {
          localStorage.setItem(storageKey, JSON.stringify(data));
        }

        const authResults = {
          ...processedData,
          name:
            nameFieldType === 'separate' ? `${firstName} ${lastName}` : name,
          firstName: nameFieldType === 'separate' ? firstName : undefined,
          lastName: nameFieldType === 'separate' ? lastName : undefined,
          email,
          mobile,
          token: data[tokenField],
          isAuthenticated: true,
          timestamp: new Date().toISOString(),
          skipped: false,
        };

        await new Promise((f) => setTimeout(f, 1000));
        goToNextBlock({ [fieldName]: authResults });
      } else {
        throw new Error(data.error || 'OTP verification failed');
      }
    } catch (e: any) {
      setError(e.message || 'OTP verification failed');
    }

    setLoading(false);
  };

  const handleWelcomeContinue = () => {
    // When user clicks continue from welcome screen, apply skip logic if enabled
    if (skipIfLoggedIn) {
      goToNextBlock();
    } else {
      goToNextBlock();
    }
  };

  const handleSignInAsDifferent = () => {
    localStorage.removeItem(storageKey);
    if (nameFieldType === 'separate') {
      setCurrentStep('firstName');
    } else if (requireName) {
      setCurrentStep('name');
    } else {
      determineFirstStep();
    }
    setName('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setMobile('');
    setError(null);
    setSuccess(null);
    setIsManualNavigation(false);
  };

  const getStepIcon = () => {
    switch (currentStep) {
      case 'name':
      case 'firstName':
        return <User className="w-6 h-6" />;
      case 'email':
        return <Mail className="w-6 h-6" />;
      case 'phone':
        return <Phone className="w-6 h-6" />;
      case 'email-otp':
      case 'phone-otp':
        return <KeyRound className="w-6 h-6" />;
      case 'welcome':
        return <CheckCircle2 className="w-6 h-6" />;
      default:
        return <User className="w-6 h-6" />;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'name':
        return `What's your ${nameLabel.toLowerCase()}?`;
      case 'firstName':
        return `What's your name?`;
      case 'email':
        return `What's your ${emailLabel.toLowerCase()}?`;
      case 'phone':
        return `What's your ${mobileLabel.toLowerCase()}?`;
      case 'email-otp':
        return 'Enter email verification code';
      case 'phone-otp':
        return 'Enter mobile verification code';
      case 'welcome':
        return 'Welcome back!';
      default:
        return 'Authentication';
    }
  };

  const getStepDescription = () => {
    switch (currentStep) {
      case 'name':
        return `Please enter your ${nameLabel.toLowerCase()}`;
      case 'firstName':
        return `Please enter your first and last name`;
      case 'email':
        return useOtp
          ? "We'll send a verification code to this email"
          : "We'll use this to authenticate you";
      case 'phone':
        return useOtp
          ? "We'll send a verification code to this number"
          : "We'll use this to authenticate you";
      case 'email-otp':
        return `Enter the verification code sent to ${email}`;
      case 'phone-otp':
        return `Enter the verification code sent to ${mobile}`;
      case 'welcome':
        const displayName =
          nameFieldType === 'separate' && firstName ? firstName : name;
        return displayName
          ? `Hello ${displayName}, you're already authenticated.`
          : "You're already authenticated.";
      default:
        return '';
    }
  };

  const canSubmit = () => {
    switch (currentStep) {
      case 'name':
        return name.trim().length > 0;
      case 'firstName':
        return firstName.trim().length > 0 && lastName.trim().length > 0;
      case 'email':
        return email.trim().length > 0 && email.includes('@');
      case 'phone':
        return mobile.trim().length > 0;
      case 'email-otp':
        return emailOtp.length >= 4;
      case 'phone-otp':
        return mobileOtp.length >= 4;
      default:
        return false;
    }
  };

  // Add a function to determine the previous step
  const getPreviousStep = (): AuthStep | null => {
    switch (currentStep) {
      case 'firstName':
        // firstName is always the first step when using separate names
        return null;
      case 'name':
        // name is always the first step when using single name field
        return null;
      case 'email':
        if (requireName) {
          // If separate names, go back to firstName; if single, go back to name
          return nameFieldType === 'separate' ? 'firstName' : 'name';
        }
        // Email is the first step if no name required
        return null;
      case 'phone':
        if (requireEmail) {
          return 'email';
        } else if (requireName) {
          // If no email but name is required, go to appropriate name step
          return nameFieldType === 'separate' ? 'firstName' : 'name';
        }
        // Phone is the first step if neither name nor email required
        return null;
      case 'email-otp':
        // During OTP flow, might need to go back to the input step
        if (requireEmail) {
          return requireMobile ? 'phone' : 'email';
        }
        return 'email';
      case 'phone-otp':
        return 'phone';
      default:
        return null;
    }
  };

  // Add a function to handle going back
  const handleGoBack = () => {
    const previousStep = getPreviousStep();
    if (previousStep) {
      setCurrentStep(previousStep);
      setError(null);
      setSuccess(null);
      // Clear OTP specific data if moving away from OTP steps
      if (currentStep.includes('otp')) {
        setEmailOtp('');
        setMobileOtp('');
        setOtpSent({});
      }
    }
  };

  const renderInput = () => {
    switch (currentStep) {
      case 'name':
        return (
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={`Enter your ${nameLabel.toLowerCase()}`}
            className="text-lg h-14 text-center"
            autoFocus
            onKeyPress={(e) =>
              e.key === 'Enter' && canSubmit() && handleStepSubmit()
            }
          />
        );
      case 'firstName':
        return (
          <div className="space-y-4">
            <Input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder={`Enter your ${firstNameLabel.toLowerCase()}`}
              className="text-lg h-14 text-center"
              autoFocus
              onKeyPress={(e) =>
                e.key === 'Enter' &&
                lastName.trim() &&
                canSubmit() &&
                handleStepSubmit()
              }
            />
            <Input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder={`Enter your ${lastNameLabel.toLowerCase()}`}
              className="text-lg h-14 text-center"
              onKeyPress={(e) =>
                e.key === 'Enter' && canSubmit() && handleStepSubmit()
              }
            />
          </div>
        );
      case 'email':
        return (
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={`Enter your ${emailLabel.toLowerCase()}`}
            className="text-lg h-14 text-center"
            autoFocus
            onKeyPress={(e) =>
              e.key === 'Enter' && canSubmit() && handleStepSubmit()
            }
          />
        );
      case 'phone':
        return (
          <Input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            placeholder={`Enter your ${mobileLabel.toLowerCase()}`}
            className="text-lg h-14 text-center"
            autoFocus
            onKeyPress={(e) =>
              e.key === 'Enter' && canSubmit() && handleStepSubmit()
            }
          />
        );
      case 'email-otp':
        return (
          <Input
            type="text"
            value={emailOtp}
            onChange={(e) =>
              setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="Enter verification code"
            className="text-lg h-14 text-center tracking-widest font-mono"
            maxLength={6}
            autoFocus
            onKeyPress={(e) =>
              e.key === 'Enter' && canSubmit() && handleStepSubmit()
            }
          />
        );
      case 'phone-otp':
        return (
          <Input
            type="text"
            value={mobileOtp}
            onChange={(e) =>
              setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
            }
            placeholder="Enter verification code"
            className="text-lg h-14 text-center tracking-widest font-mono"
            maxLength={6}
            autoFocus
            onKeyPress={(e) =>
              e.key === 'Enter' && canSubmit() && handleStepSubmit()
            }
          />
        );
      default:
        return null;
    }
  };

  // Show loading for initial authentication check
  if (
    loading &&
    currentStep !== 'email-otp' &&
    currentStep !== 'phone-otp' &&
    currentStep !== 'welcome'
  ) {
    return (
      <Card className="w-full min-w-0  mx-auto">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm text-muted-foreground">
              {skipIfLoggedIn
                ? 'Checking authentication...'
                : 'Checking authentication...'}
            </span>
          </div>
          {skipIfLoggedIn && (
            <div className="flex items-center justify-center space-x-2 mt-2">
              <SkipForward className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-600">
                Skip if logged in enabled
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (currentStep === 'welcome') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="w-full min-w-0  mx-auto">
          <CardHeader className="text-center">
            <motion.div
              className="w-12 h-12 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            >
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </motion.div>
            <CardTitle className="text-xl text-card">
              {getStepTitle()}
            </CardTitle>
            <CardDescription>{getStepDescription()}</CardDescription>
            {skipIfLoggedIn && isManualNavigation && (
              <div className="mt-2 p-2 bg-blue-50 rounded-md">
                <div className="flex items-center justify-center space-x-2 text-sm text-blue-700">
                  <SkipForward className="w-4 h-4" />
                  <span>
                    Auto-skip is enabled, but you manually navigated here
                  </span>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleWelcomeContinue}
              className="w-full"
              size="lg"
            >
              Continue
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={handleSignInAsDifferent}
              className="w-full"
            >
              Sign in as different user
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="w-full min-w-0  mx-auto">
        <CardHeader className="text-center">
          <motion.div
            className="w-12 h-12 mx-auto mb-4 rounded-full bg-blue-100 flex items-center justify-center"
            key={currentStep}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            {getStepIcon()}
          </motion.div>
          <CardTitle className="text-xl">{getStepTitle()}</CardTitle>
          <CardDescription>{getStepDescription()}</CardDescription>
          {skipIfLoggedIn && (
            <div className="mt-2 p-2 bg-blue-50 rounded-md">
              <div className="flex items-center justify-center space-x-2 text-xs text-blue-600">
                <SkipForward className="w-3 h-3" />
                <span>Will skip if already logged in</span>
              </div>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            {renderInput()}
          </motion.div>

          {(currentStep === 'email-otp' || currentStep === 'phone-otp') &&
            otpSent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                <Badge variant="secondary" className="text-xs">
                  Code sent successfully
                </Badge>
              </motion.div>
            )}

          <Button
            onClick={handleStepSubmit}
            disabled={!canSubmit() || loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {currentStep.includes('otp') ? 'Verifying...' : 'Processing...'}
              </>
            ) : (
              <>
                {currentStep.includes('otp') ? 'Verify Code' : 'Continue'}
                <ArrowRight className="ml-2 w-4 h-4" />
              </>
            )}
          </Button>

          {getPreviousStep() && (
            <Button variant="outline" onClick={handleGoBack} className="w-full">
              Back to previous step
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

/**
 * Chat renderer for AuthBlock - provides a streamlined multi-step chat experience
 * for collecting user authentication information (name, email, mobile)
 */
const AuthChatRenderer: React.FC<ChatRendererProps> = ({
  block,
  value,
  onChange,
  onSubmit,
  theme,
  disabled = false,
  error,
}) => {
  const themeConfig = theme || themes.default;

  // Parse configuration from block
  const requireName = (block as any).requireName || false;
  const nameFieldType = (block as any).nameFieldType || 'separate';
  const requireEmail = (block as any).requireEmail || true;
  const requireMobile = (block as any).requireMobile || false;

  // Labels from block configuration
  const nameLabel = (block as any).nameLabel || 'Full Name';
  const firstNameLabel = (block as any).firstNameLabel || 'First Name';
  const lastNameLabel = (block as any).lastNameLabel || 'Last Name';
  const emailLabel = (block as any).emailLabel || 'Email';
  const mobileLabel = (block as any).mobileLabel || 'Mobile Number';

  // Determine the steps based on configuration
  type AuthStep = 'name' | 'firstName' | 'lastName' | 'email' | 'mobile';

  const getInitialStep = (): AuthStep => {
    if (requireName) {
      return nameFieldType === 'separate' ? 'firstName' : 'name';
    }
    if (requireEmail) return 'email';
    if (requireMobile) return 'mobile';
    // Fallback - should not happen if block is configured correctly
    return 'email';
  };

  const [step, setStep] = useState<AuthStep>(getInitialStep());

  // Initialize form data from existing value or defaults
  const [formData, setFormData] = useState(() => {
    const existing = value && typeof value === 'object' ? value : {};
    return {
      name: existing.name || '',
      firstName: existing.firstName || '',
      lastName: existing.lastName || '',
      email: existing.email || '',
      mobile: existing.mobile || '',
    };
  });

  // Sync with external value changes
  useEffect(() => {
    if (value && typeof value === 'object') {
      setFormData((prev) => ({
        ...prev,
        name: value.name || prev.name,
        firstName: value.firstName || prev.firstName,
        lastName: value.lastName || prev.lastName,
        email: value.email || prev.email,
        mobile: value.mobile || prev.mobile,
      }));
    }
  }, [value]);

  // Get the next step based on current step (returns null if this is the last step)
  const getNextStep = (currentStep: AuthStep): AuthStep | null => {
    switch (currentStep) {
      case 'name':
        if (requireEmail) return 'email';
        if (requireMobile) return 'mobile';
        return null; // Last step
      case 'firstName':
        return 'lastName';
      case 'lastName':
        if (requireEmail) return 'email';
        if (requireMobile) return 'mobile';
        return null; // Last step
      case 'email':
        if (requireMobile) return 'mobile';
        return null; // Last step
      case 'mobile':
        return null; // Last step
      default:
        return null;
    }
  };

  // Validate current step
  const validateCurrentStep = (): string | null => {
    switch (step) {
      case 'name':
        if (!formData.name.trim()) return `${nameLabel} is required`;
        break;
      case 'firstName':
        if (!formData.firstName.trim()) return `${firstNameLabel} is required`;
        break;
      case 'lastName':
        if (!formData.lastName.trim()) return `${lastNameLabel} is required`;
        break;
      case 'email':
        if (!formData.email.trim()) return `${emailLabel} is required`;
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email))
          return 'Please enter a valid email address';
        break;
      case 'mobile':
        if (!formData.mobile.trim()) return `${mobileLabel} is required`;
        break;
    }
    return null;
  };

  const [localError, setLocalError] = useState<string | null>(null);
  const displayError = error || localError;

  // Handle final submit
  const handleFinalSubmit = () => {
    const result = {
      ...formData,
      // Set combined name if using separate fields
      ...(nameFieldType === 'separate' && {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
      }),
    };
    onChange(result);
    onSubmit(result);
  };

  // Handle advancing to next step or submitting if on last step
  const handleNext = () => {
    const validationError = validateCurrentStep();
    if (validationError) {
      setLocalError(validationError);
      return;
    }
    setLocalError(null);

    const nextStep = getNextStep(step);
    if (nextStep) {
      setStep(nextStep);
    } else {
      // This is the last step, submit directly
      handleFinalSubmit();
    }
  };

  // Handle input change
  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setLocalError(null);
  };

  // Check if this is the last step
  const isLastStep = getNextStep(step) === null;

  // Render input field with consistent styling
  const renderInputStep = (
    field: keyof typeof formData,
    label: string,
    type: string = 'text',
    placeholder: string = ''
  ) => (
    <div
      className="flex flex-col gap-4 w-full"
      style={{ color: themeConfig.colors.text }}
    >
      <div className="flex items-center gap-2 opacity-50">
        {field === 'email' ? (
          <Mail className="w-4 h-4" />
        ) : field === 'mobile' ? (
          <Phone className="w-4 h-4" />
        ) : (
          <User className="w-4 h-4" />
        )}
        <span className="text-sm">{label}</span>
      </div>

      <div className="flex gap-2 items-center">
        <Input
          type={type}
          value={formData[field]}
          onChange={(e) => handleInputChange(field, e.target.value)}
          disabled={disabled}
          placeholder={placeholder}
          autoFocus
          className={cn(
            'flex-1',
            themeConfig.field?.input,
            displayError && 'border-destructive'
          )}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !disabled) {
              e.preventDefault();
              handleNext();
            }
          }}
        />

        <Button
          type="button"
          onClick={handleNext}
          disabled={disabled || !formData[field].trim()}
          className={cn(themeConfig.button?.primary, 'w-auto px-8')}
          style={
            themeConfig?.colors?.primary
              ? { backgroundColor: themeConfig.colors.primary }
              : undefined
          }
        >
          {isLastStep ? 'Continue' : 'Next'}
        </Button>
      </div>

      {displayError && (
        <p className={themeConfig.field.error}>{displayError}</p>
      )}
    </div>
  );

  // Render based on current step
  switch (step) {
    case 'name':
      return renderInputStep('name', nameLabel, 'text', 'Enter your full name');

    case 'firstName':
      return renderInputStep(
        'firstName',
        firstNameLabel,
        'text',
        'Enter your first name'
      );

    case 'lastName':
      return renderInputStep(
        'lastName',
        lastNameLabel,
        'text',
        'Enter your last name'
      );

    case 'email':
      return renderInputStep(
        'email',
        emailLabel,
        'email',
        'Enter your email address'
      );

    case 'mobile':
      return renderInputStep(
        'mobile',
        mobileLabel,
        'tel',
        'Enter your mobile number'
      );

    default:
      return null;
  }
};

export const AuthBlock: BlockDefinition = {
  type: 'auth',
  name: 'Authentication',
  description: 'Step-by-step user authentication with optional OTP',
  icon: <UserCheck className="w-4 h-4" />,
  defaultData: {
    type: 'auth',
    fieldName: 'authResults',
    loginUrl: '/api/patient/login',
    signupUrl: '/api/patient/login',
    useOtp: false,
    sendEmailOtpUrl: '',
    verifyEmailOtpUrl: '',
    sendMobileOtpUrl: '',
    verifyMobileOtpUrl: '',
    tokenField: 'token',
    tokenStorageKey: 'authToken',
    validateTokenUrl: '',
    requireName: true,
    nameFieldType: 'separate', // New: "single" or "separate"
    requireEmail: true,
    requireMobile: false,
    nameLabel: 'Full Name',
    firstNameLabel: 'First Name', // New
    lastNameLabel: 'Last Name', // New
    emailLabel: 'Email',
    mobileLabel: 'Mobile Number',
    fieldMappings: {},
    customHeaders: {},
    additionalBodyParams: {},
    skipIfLoggedIn: false, // New configuration option
    showContinueButton: false,
  },
  renderItem: (props: ContentBlockItemProps) => <AuthBlockItem {...props} />,
  renderFormFields: (props: ContentBlockItemProps) => (
    <AuthBlockForm {...props} />
  ),
  renderPreview: () => <AuthBlockPreview />,
  renderBlock: (props: BlockRendererProps) => <AuthRenderer {...props} />,
  validate: (data: BlockData) => {
    // Check that either email or mobile is required
    if (!data.requireEmail && !data.requireMobile) {
      return 'Either email or mobile must be enabled for authentication to work';
    }

    // Check that at least one auth URL is provided
    if (!data.loginUrl && !data.signupUrl) {
      return 'At least one authentication URL (login or signup) is required';
    }

    // Check OTP configuration
    if (data.useOtp) {
      if (
        data.requireEmail &&
        (!data.sendEmailOtpUrl || !data.verifyEmailOtpUrl)
      ) {
        return 'Both Send Email OTP URL and Verify Email OTP URL are required when Email is enabled with OTP';
      }
      if (
        data.requireMobile &&
        (!data.sendMobileOtpUrl || !data.verifyMobileOtpUrl)
      ) {
        return 'Both Send Mobile OTP URL and Verify Mobile OTP URL are required when Mobile is enabled with OTP';
      }
    }

    return null;
  },
  // Output schema - this block returns a complex authentication object
  outputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        optional: true,
        description: 'Full name of the user',
      },
      firstName: {
        type: 'string',
        optional: true,
        description: 'First name (if using separate name fields)',
      },
      lastName: {
        type: 'string',
        optional: true,
        description: 'Last name (if using separate name fields)',
      },
      email: { type: 'string', optional: true, description: 'Email address' },
      mobile: {
        type: 'string',
        optional: true,
        description: 'Mobile phone number',
      },
      token: { type: 'string', description: 'Authentication token' },
      isAuthenticated: {
        type: 'boolean',
        description: 'Whether authentication was successful',
      },
      skipped: {
        type: 'boolean',
        description: 'Whether authentication was skipped',
      },
      skipReason: {
        type: 'string',
        optional: true,
        description: 'Reason for skipping (if skipped)',
      },
    },
  },
  // Input schema - what user data this block collects
  inputSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        optional: true,
        description: 'Full name of the user',
      },
      firstName: {
        type: 'string',
        optional: true,
        description: 'First name (if using separate fields)',
      },
      lastName: {
        type: 'string',
        optional: true,
        description: 'Last name (if using separate fields)',
      },
      email: {
        type: 'string',
        optional: true,
        description: 'Email address for authentication',
      },
      mobile: {
        type: 'string',
        optional: true,
        description: 'Mobile number for authentication',
      },
    },
  },
  // Chat renderer for chat layout
  chatRenderer: (props: ChatRendererProps) => <AuthChatRenderer {...props} />,
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};
