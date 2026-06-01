import React, { useEffect, useState } from 'react';
import {
  ShoppingCart,
  Check,
  Mail,
  Phone,
  MapPin,
  User,
  Building,
} from 'lucide-react';
import type {
  BlockData,
  BlockDefinition,
  ContentBlockItemProps,
  ThemeDefinition,
  ChatRendererProps,
} from '../types';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Label } from '../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Button } from '../components/ui/button';
import { generateFieldName } from './utils/GenFieldName';
import { cn } from '../lib/utils';
import { useSurveyForm } from '../context/SurveyFormContext';
import { themes } from '../themes';

// Form component for editing the block configuration
const CheckoutBlockForm: React.FC<ContentBlockItemProps> = ({
  data,
  onUpdate,
}) => {
  const handleChange = (field: string, value: string | boolean) => {
    onUpdate?.({
      ...data,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-sm" htmlFor="label">
            Label
          </Label>
          <Input
            id="label"
            value={data.label || ''}
            onChange={(e) => handleChange('label', e.target.value)}
            placeholder="Checkout Information"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="description">
          Description
        </Label>
        <Input
          id="description"
          value={data.description || ''}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Please provide your contact and shipping details"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showContactInfo"
            checked={!!data.showContactInfo}
            onCheckedChange={(checked) =>
              handleChange('showContactInfo', !!checked)
            }
          />
          <Label className="text-sm" htmlFor="showContactInfo">
            Show Contact Information
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showShippingAddress"
            checked={!!data.showShippingAddress}
            onCheckedChange={(checked) =>
              handleChange('showShippingAddress', !!checked)
            }
          />
          <Label className="text-sm" htmlFor="showShippingAddress">
            Show Shipping Address
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="showBillingAddress"
            checked={!!data.showBillingAddress}
            onCheckedChange={(checked) =>
              handleChange('showBillingAddress', !!checked)
            }
          />
          <Label className="text-sm" htmlFor="showBillingAddress">
            Show Billing Address
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="sameAsBilling"
            checked={!!data.sameAsBilling}
            onCheckedChange={(checked) =>
              handleChange('sameAsBilling', !!checked)
            }
          />
          <Label className="text-sm" htmlFor="sameAsBilling">
            Same as Shipping (Default)
          </Label>
        </div>
      </div>

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
            id="requirePhone"
            checked={!!data.requirePhone}
            onCheckedChange={(checked) =>
              handleChange('requirePhone', !!checked)
            }
          />
          <Label className="text-sm" htmlFor="requirePhone">
            Require Phone
          </Label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="collectFullName"
            checked={!!data.collectFullName}
            onCheckedChange={(checked) =>
              handleChange('collectFullName', !!checked)
            }
          />
          <Label className="text-sm" htmlFor="collectFullName">
            Collect Full Name
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="allowCompany"
            checked={!!data.allowCompany}
            onCheckedChange={(checked) =>
              handleChange('allowCompany', !!checked)
            }
          />
          <Label className="text-sm" htmlFor="allowCompany">
            Allow Company Field
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="defaultCountry">
          Default Country
        </Label>
        <Select
          value={data.defaultCountry || 'US'}
          onValueChange={(value) => handleChange('defaultCountry', value)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select country" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="US">United States</SelectItem>
            <SelectItem value="CA">Canada</SelectItem>
            <SelectItem value="GB">United Kingdom</SelectItem>
            <SelectItem value="AU">Australia</SelectItem>
            <SelectItem value="FR">France</SelectItem>
            <SelectItem value="DE">Germany</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm" htmlFor="className">
          CSS Class Names
        </Label>
        <Input
          id="className"
          value={data.className || ''}
          onChange={(e) => handleChange('className', e.target.value)}
          placeholder="checkout-form"
        />
      </div>
    </div>
  );
};

// Component to render the block in the builder canvas
const CheckoutBlockItem: React.FC<ContentBlockItemProps> = ({ data }) => {
  return (
    <div className="space-y-6 p-4 border rounded-lg bg-gray-50">
      {data.label && (
        <Label className="text-lg font-semibold">{data.label}</Label>
      )}

      {data.showContactInfo && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-gray-700">
            Contact Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {data.requireEmail && (
              <Input disabled placeholder="Email address" className="text-sm" />
            )}
            {data.requirePhone && (
              <Input disabled placeholder="Phone number" className="text-sm" />
            )}
          </div>
        </div>
      )}

      {data.showShippingAddress && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-gray-700">
            Shipping Address
          </h3>
          <div className="space-y-2">
            {data.collectFullName && (
              <div className="grid grid-cols-2 gap-2">
                <Input disabled placeholder="First name" className="text-sm" />
                <Input disabled placeholder="Last name" className="text-sm" />
              </div>
            )}
            {data.allowCompany && (
              <Input
                disabled
                placeholder="Company (optional)"
                className="text-sm"
              />
            )}
            <Input disabled placeholder="Address line 1" className="text-sm" />
            <Input
              disabled
              placeholder="Address line 2 (optional)"
              className="text-sm"
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input disabled placeholder="City" className="text-sm" />
              <Input disabled placeholder="State" className="text-sm" />
              <Input disabled placeholder="ZIP code" className="text-sm" />
            </div>
          </div>
        </div>
      )}

      {data.showBillingAddress && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-gray-700">Billing Address</h3>
          <div className="flex items-center space-x-2 mb-2">
            <Checkbox disabled checked={data.sameAsBilling} />
            <Label className="text-sm">Same as shipping address</Label>
          </div>
          <div className="space-y-2 opacity-50">
            <Input disabled placeholder="Address line 1" className="text-sm" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input disabled placeholder="City" className="text-sm" />
              <Input disabled placeholder="State" className="text-sm" />
              <Input disabled placeholder="ZIP code" className="text-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Preview component shown in the block library
const CheckoutBlockPreview: React.FC = () => {
  return (
    <div className="w-full flex items-center justify-center py-2">
      <div className="space-y-2 w-4/5 max-w-full">
        <div className="text-xs font-medium text-gray-600">
          Contact & Shipping
        </div>
        <Input disabled placeholder="Email" className="text-xs h-8" />
        <Input disabled placeholder="Address" className="text-xs h-8" />
        <div className="grid grid-cols-3 gap-1">
          <Input disabled placeholder="City" className="text-xs h-8" />
          <Input disabled placeholder="State" className="text-xs h-8" />
          <Input disabled placeholder="ZIP" className="text-xs h-8" />
        </div>
      </div>
    </div>
  );
};

interface CheckoutRendererProps {
  block: BlockData;
  value?: any;
  onChange?: (value: any) => void;
  onBlur?: () => void;
  error?: string;
  disabled?: boolean;
  theme?: ThemeDefinition;
}

interface AddressData {
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

const countries = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'AU', name: 'Australia' },
  { code: 'FR', name: 'France' },
  { code: 'DE', name: 'Germany' },
  { code: 'MX', name: 'Mexico' },
  { code: 'JP', name: 'Japan' },
  { code: 'IN', name: 'India' },
  { code: 'BR', name: 'Brazil' },
];

const usStates = [
  { code: 'AL', name: 'Alabama' },
  { code: 'AK', name: 'Alaska' },
  { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' },
  { code: 'CA', name: 'California' },
  { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' },
  { code: 'DE', name: 'Delaware' },
  { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' },
  { code: 'HI', name: 'Hawaii' },
  { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' },
  { code: 'IN', name: 'Indiana' },
  { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' },
  { code: 'KY', name: 'Kentucky' },
  { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' },
  { code: 'MD', name: 'Maryland' },
  { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' },
  { code: 'MN', name: 'Minnesota' },
  { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' },
  { code: 'MT', name: 'Montana' },
  { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' },
  { code: 'NH', name: 'New Hampshire' },
  { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' },
  { code: 'NY', name: 'New York' },
  { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' },
  { code: 'OH', name: 'Ohio' },
  { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' },
  { code: 'PA', name: 'Pennsylvania' },
  { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' },
  { code: 'SD', name: 'South Dakota' },
  { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' },
  { code: 'UT', name: 'Utah' },
  { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' },
  { code: 'WA', name: 'Washington' },
  { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' },
  { code: 'WY', name: 'Wyoming' },
];

const emptyAddress = (): AddressData => ({
  firstName: '',
  lastName: '',
  company: '',
  address1: '',
  address2: '',
  city: '',
  state: '',
  zip: '',
  country: 'US',
});

const CheckoutRenderer: React.FC<CheckoutRendererProps> = ({
  block,
  value = {},
  onChange,
  onBlur,
  error,
  disabled = false,
  theme = null,
}) => {
  const { setValue } = useSurveyForm();
  const fieldName = block.fieldName || 'checkout';

  const themeConfig = (theme ?? themes) as ThemeDefinition;

  const [formState, setFormState] = useState({
    email: value.email || '',
    phone: value.phone || '',
    shippingAddress: value.shippingAddress || emptyAddress(),
    billingAddress: value.billingAddress || emptyAddress(),
    billingIsSame: value.billingIsSame ?? block.sameAsBilling ?? true,
  });

  useEffect(() => {
    const updatedState = {
      ...formState,
      billingAddress: formState.billingIsSame
        ? formState.shippingAddress
        : formState.billingAddress,
    };
    onChange?.(updatedState);
    setValue(fieldName, updatedState);
  }, [formState]);

  const handleContactChange = (field: string, val: string) => {
    setFormState((prev) => ({ ...prev, [field]: val }));
  };

  const handleAddressChange = (
    addressType: 'shippingAddress' | 'billingAddress',
    field: string,
    val: string,
  ) => {
    setFormState((prev) => ({
      ...prev,
      [addressType]: { ...prev[addressType], [field]: val },
    }));
  };

  const handleBillingToggle = (checked: boolean) => {
    setFormState((prev) => ({ ...prev, billingIsSame: checked }));
  };

  const sectionClassName =
    'bg-white border border-gray-200 rounded-xl p-6 shadow-sm';

  return (
    <div
      className={cn(
        'survey-checkout w-full min-w-0 space-y-6 max-w-2xl mx-auto',
        block.className,
      )}
    >
      {/* Header */}
      {block.label && (
        <div className="text-center space-y-2 pb-4">
          <h2 className="text-2xl font-semibold text-gray-900">
            {block.label}
          </h2>
          {block.description && (
            <p className="text-gray-600 text-base">{block.description}</p>
          )}
        </div>
      )}

      {/* Contact Information Section */}
      {block.showContactInfo && (
        <div className={sectionClassName}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
              *
            </span>
            Contact Information
          </h3>
          <div className="space-y-4">
            {block.requireEmail && (
              <div>
                <Label
                  htmlFor={`${fieldName}-email`}
                  className={themeConfig.field.label}
                >
                  Email address{' '}
                  {block.requireEmail && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                <Input
                  id={`${fieldName}-email`}
                  type="email"
                  value={formState.email}
                  onChange={(e) => handleContactChange('email', e.target.value)}
                  onBlur={onBlur}
                  disabled={disabled}
                  placeholder="john@example.com"
                  className={cn(
                    themeConfig.field.input,
                    error &&
                      'border-red-500 focus:ring-red-500 focus:border-red-500',
                  )}
                />
              </div>
            )}
            {block.requirePhone && (
              <div>
                <Label
                  htmlFor={`${fieldName}-phone`}
                  className={themeConfig.field.label}
                >
                  Phone number{' '}
                  {block.requirePhone && (
                    <span className="text-red-500">*</span>
                  )}
                </Label>
                <Input
                  id={`${fieldName}-phone`}
                  type="tel"
                  value={formState.phone}
                  onChange={(e) => handleContactChange('phone', e.target.value)}
                  onBlur={onBlur}
                  disabled={disabled}
                  placeholder="+1 (555) 123-4567"
                  className={cn(
                    themeConfig.field.input,
                    error &&
                      'border-red-500 focus:ring-red-500 focus:border-red-500',
                  )}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shipping Address Section */}
      {block.showShippingAddress && (
        <div className={sectionClassName}>
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
              *
            </span>
            Shipping Address
          </h3>
          <div className="space-y-4">
            {block.collectFullName && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className={themeConfig.field.label}>
                    First name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formState.shippingAddress.firstName}
                    onChange={(e) =>
                      handleAddressChange(
                        'shippingAddress',
                        'firstName',
                        e.target.value,
                      )
                    }
                    placeholder="John"
                    className={themeConfig.field.input}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className={themeConfig.field.label}>
                    Last name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formState.shippingAddress.lastName}
                    onChange={(e) =>
                      handleAddressChange(
                        'shippingAddress',
                        'lastName',
                        e.target.value,
                      )
                    }
                    placeholder="Doe"
                    className={themeConfig.field.input}
                    disabled={disabled}
                  />
                </div>
              </div>
            )}

            {block.allowCompany && (
              <div>
                <Label className={themeConfig.field.label}>
                  Company (optional)
                </Label>
                <Input
                  value={formState.shippingAddress.company}
                  onChange={(e) =>
                    handleAddressChange(
                      'shippingAddress',
                      'company',
                      e.target.value,
                    )
                  }
                  placeholder="Acme Inc."
                  className={themeConfig.field.input}
                  disabled={disabled}
                />
              </div>
            )}

            <div>
              <Label className={themeConfig.field.label}>
                Address <span className="text-red-500">*</span>
              </Label>
              <Input
                value={formState.shippingAddress.address1}
                onChange={(e) =>
                  handleAddressChange(
                    'shippingAddress',
                    'address1',
                    e.target.value,
                  )
                }
                placeholder="123 Main Street"
                className={themeConfig.field.input}
                disabled={disabled}
              />
            </div>

            <div>
              <Input
                value={formState.shippingAddress.address2}
                onChange={(e) =>
                  handleAddressChange(
                    'shippingAddress',
                    'address2',
                    e.target.value,
                  )
                }
                placeholder="Apartment, suite, etc. (optional)"
                className={themeConfig.field.input}
                disabled={disabled}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className={themeConfig.field.label}>
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formState.shippingAddress.city}
                  onChange={(e) =>
                    handleAddressChange(
                      'shippingAddress',
                      'city',
                      e.target.value,
                    )
                  }
                  placeholder="New York"
                  className={themeConfig.field.input}
                  disabled={disabled}
                />
              </div>
              <div>
                <Label className={themeConfig.field.label}>
                  State <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formState.shippingAddress.state}
                  onValueChange={(value) =>
                    handleAddressChange('shippingAddress', 'state', value)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className={themeConfig.field.select}>
                    <SelectValue placeholder="State" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {usStates.map((state) => (
                      <SelectItem key={state.code} value={state.code}>
                        {state.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={themeConfig.field.label}>
                  ZIP code <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formState.shippingAddress.zip}
                  onChange={(e) =>
                    handleAddressChange(
                      'shippingAddress',
                      'zip',
                      e.target.value,
                    )
                  }
                  placeholder="10001"
                  className={themeConfig.field.input}
                  disabled={disabled}
                />
              </div>
            </div>

            <div>
              <Label className={themeConfig.field.label}>
                Country <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formState.shippingAddress.country}
                onValueChange={(value) =>
                  handleAddressChange('shippingAddress', 'country', value)
                }
                disabled={disabled}
              >
                <SelectTrigger className={themeConfig.field.select}>
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      {country.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Billing Address Section */}
      {block.showBillingAddress && (
        <div className={sectionClassName}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                *
              </span>
              Billing Address
            </h3>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="billingIsSame"
                checked={formState.billingIsSame}
                onCheckedChange={handleBillingToggle}
                disabled={disabled}
                className="w-5 h-5"
              />
              <Label
                htmlFor="billingIsSame"
                className="text-sm text-gray-700 font-medium cursor-pointer"
              >
                Same as shipping address
              </Label>
            </div>
          </div>

          {!formState.billingIsSame && (
            <div className="space-y-4">
              {block.collectFullName && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className={themeConfig.field.label}>
                      First name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formState.billingAddress.firstName}
                      onChange={(e) =>
                        handleAddressChange(
                          'billingAddress',
                          'firstName',
                          e.target.value,
                        )
                      }
                      placeholder="John"
                      className={themeConfig.field.input}
                      disabled={disabled}
                    />
                  </div>
                  <div>
                    <Label className={themeConfig.field.label}>
                      Last name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={formState.billingAddress.lastName}
                      onChange={(e) =>
                        handleAddressChange(
                          'billingAddress',
                          'lastName',
                          e.target.value,
                        )
                      }
                      placeholder="Doe"
                      className={themeConfig.field.input}
                      disabled={disabled}
                    />
                  </div>
                </div>
              )}

              {block.allowCompany && (
                <div>
                  <Label className={themeConfig.field.label}>
                    Company (optional)
                  </Label>
                  <Input
                    value={formState.billingAddress.company}
                    onChange={(e) =>
                      handleAddressChange(
                        'billingAddress',
                        'company',
                        e.target.value,
                      )
                    }
                    placeholder="Acme Inc."
                    className={themeConfig.field.input}
                    disabled={disabled}
                  />
                </div>
              )}

              <div>
                <Label className={themeConfig.field.label}>
                  Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={formState.billingAddress.address1}
                  onChange={(e) =>
                    handleAddressChange(
                      'billingAddress',
                      'address1',
                      e.target.value,
                    )
                  }
                  placeholder="123 Main Street"
                  className={themeConfig.field.input}
                  disabled={disabled}
                />
              </div>

              <div>
                <Input
                  value={formState.billingAddress.address2}
                  onChange={(e) =>
                    handleAddressChange(
                      'billingAddress',
                      'address2',
                      e.target.value,
                    )
                  }
                  placeholder="Apartment, suite, etc. (optional)"
                  className={themeConfig.field.input}
                  disabled={disabled}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <Label className={themeConfig.field.label}>
                    City <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formState.billingAddress.city}
                    onChange={(e) =>
                      handleAddressChange(
                        'billingAddress',
                        'city',
                        e.target.value,
                      )
                    }
                    placeholder="New York"
                    className={themeConfig.field.input}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label className={themeConfig.field.label}>
                    State <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formState.billingAddress.state}
                    onValueChange={(value) =>
                      handleAddressChange('billingAddress', 'state', value)
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger className={themeConfig.field.select}>
                      <SelectValue placeholder="State" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {usStates.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className={themeConfig.field.label}>
                    ZIP code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={formState.billingAddress.zip}
                    onChange={(e) =>
                      handleAddressChange(
                        'billingAddress',
                        'zip',
                        e.target.value,
                      )
                    }
                    placeholder="10001"
                    className={themeConfig.field.input}
                    disabled={disabled}
                  />
                </div>
              </div>

              <div>
                <Label className={themeConfig.field.label}>
                  Country <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formState.billingAddress.country}
                  onValueChange={(value) =>
                    handleAddressChange('billingAddress', 'country', value)
                  }
                  disabled={disabled}
                >
                  <SelectTrigger className={themeConfig.field.select}>
                    <SelectValue placeholder="Country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {formState.billingIsSame && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 flex items-center">
                <svg
                  className="w-4 h-4 text-green-500 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Shipping and billing address are the same
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-red-400 mt-0.5 mr-3 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-red-800">
                Please fix the following errors:
              </h3>
              <p className={themeConfig.field.error}>{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Chat renderer for Checkout - provides a streamlined multi-step chat experience
 * for collecting contact information, shipping, and billing addresses
 */
const CheckoutChatRenderer: React.FC<ChatRendererProps> = ({
  block,
  value,
  onChange,
  onSubmit,
  theme,
  disabled = false,
  error,
}) => {
  // Separate state for the collected full name (used to pre-populate shipping/billing)
  const [collectedName, setCollectedName] = useState({
    firstName: value?.firstName || value?.shippingAddress?.firstName || '',
    lastName: value?.lastName || value?.shippingAddress?.lastName || '',
  });

  const [formData, setFormData] = useState({
    email: value?.email || '',
    phone: value?.phone || '',
    shippingAddress: value?.shippingAddress || {
      firstName: collectedName.firstName,
      lastName: collectedName.lastName,
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      country: block.defaultCountry || 'US',
    },
    billingAddress: value?.billingAddress || {
      firstName: collectedName.firstName,
      lastName: collectedName.lastName,
      company: '',
      address1: '',
      address2: '',
      city: '',
      state: '',
      zip: '',
      country: block.defaultCountry || 'US',
    },
    billingIsSame: value?.billingIsSame ?? block.sameAsBilling ?? true,
  });

  // Determine which steps are needed based on block configuration and user input
  const steps: Array<'contact' | 'shipping' | 'billing'> = [];
  // Contact step is shown if we need to collect name, email, or phone
  if (block.collectFullName || block.showContactInfo) steps.push('contact');
  if (block.showShippingAddress) steps.push('shipping');
  if (block.showBillingAddress && !formData.billingIsSame)
    steps.push('billing');

  const [currentStep, setCurrentStep] = useState<
    'contact' | 'shipping' | 'billing'
  >(
    block.collectFullName || block.showContactInfo
      ? 'contact'
      : block.showShippingAddress
        ? 'shipping'
        : 'billing',
  );

  const themeConfig = theme ?? themes.default;

  const primaryColor = themeConfig?.colors?.primary || '#948EC4';

  const handleContactChange = (field: string, val: string) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleAddressChange = (
    addressType: 'shippingAddress' | 'billingAddress',
    field: string,
    val: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [addressType]: { ...prev[addressType], [field]: val },
    }));
  };

  const handleFinalSubmit = () => {
    const finalData = {
      ...formData,
      // Include collected name at root level for easier access
      firstName: collectedName.firstName,
      lastName: collectedName.lastName,
      fullName: `${collectedName.firstName} ${collectedName.lastName}`.trim(),
      billingAddress: formData.billingIsSame
        ? formData.shippingAddress
        : formData.billingAddress,
    };
    onChange(finalData);
    onSubmit(finalData);
  };

  const currentStepIndex = steps.indexOf(currentStep);
  const totalSteps = steps.length;

  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1]);
    } else {
      handleFinalSubmit();
    }
  };

  const goToPreviousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1]);
    }
  };

  // Reusable step progress component
  const StepProgress = () => (
    <div className="relative flex flex-col items-center mb-2 w-full">
      {currentStepIndex > 0 && (
        <button
          type="button"
          onClick={goToPreviousStep}
          className="absolute left-0 top-0 text-sm underline h-full flex items-start cursor-pointer"
          style={{ color: primaryColor }}
        >
          Back
        </button>
      )}
      <div className="flex flex-col items-center gap-1.5">
        <span
          className="text-sm font-semibold uppercase tracking-wider whitespace-nowrap"
          style={{ color: themeConfig?.colors?.text, opacity: 0.4 }}
        >
          Step {currentStepIndex + 1} of {totalSteps}
        </span>
        <div className="w-24 h-1.5 mt-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
              backgroundColor: primaryColor,
            }}
          />
        </div>
      </div>
    </div>
  );

  // Contact Information Step (includes name if collectFullName, plus email/phone if showContactInfo)
  if (currentStep === 'contact') {
    // Determine validation requirements
    const isNameValid =
      !block.collectFullName ||
      (collectedName.firstName && collectedName.lastName);
    const isEmailValid = !block.requireEmail || formData.email;
    const isPhoneValid = !block.requirePhone || formData.phone;

    const handleContactContinue = () => {
      // Pre-populate shipping/billing with collected name
      if (block.collectFullName) {
        setFormData((prev) => ({
          ...prev,
          shippingAddress: {
            ...prev.shippingAddress,
            firstName:
              prev.shippingAddress.firstName || collectedName.firstName,
            lastName: prev.shippingAddress.lastName || collectedName.lastName,
          },
          billingAddress: {
            ...prev.billingAddress,
            firstName: prev.billingAddress.firstName || collectedName.firstName,
            lastName: prev.billingAddress.lastName || collectedName.lastName,
          },
        }));
      }
      goToNextStep();
    };

    return (
      <div className="flex flex-col gap-4 w-full">
        <StepProgress />

        <div className="flex flex-col gap-3">
          {/* First name / Last name */}
          {block.collectFullName && (
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={collectedName.firstName}
                onChange={(e) =>
                  setCollectedName((prev) => ({
                    ...prev,
                    firstName: e.target.value,
                  }))
                }
                placeholder="First name"
                className={themeConfig.field.input}
                disabled={disabled}
                autoFocus
              />
              <Input
                value={collectedName.lastName}
                onChange={(e) =>
                  setCollectedName((prev) => ({
                    ...prev,
                    lastName: e.target.value,
                  }))
                }
                placeholder="Last name"
                className={themeConfig.field.input}
                disabled={disabled}
              />
            </div>
          )}

          {/* Email / Phone - side by side on desktop */}
          {block.showContactInfo &&
            (block.requireEmail || block.requirePhone) && (
              <div
                className={cn(
                  'grid gap-3',
                  block.requireEmail && block.requirePhone
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1',
                )}
              >
                {block.requireEmail && (
                  <div className="relative">
                    <Mail
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                      style={{ color: themeConfig?.colors?.text, opacity: 0.5 }}
                    />
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        handleContactChange('email', e.target.value)
                      }
                      placeholder="Email address"
                      className={cn(themeConfig.field.input, 'pl-12')}
                      disabled={disabled}
                      autoFocus={!block.collectFullName}
                    />
                  </div>
                )}

                {block.requirePhone && (
                  <div className="relative">
                    <Phone
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none"
                      style={{ color: themeConfig?.colors?.text, opacity: 0.5 }}
                    />
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        handleContactChange('phone', e.target.value)
                      }
                      placeholder="Phone number"
                      className={cn(themeConfig.field.input, 'pl-12')}
                      disabled={disabled}
                    />
                  </div>
                )}
              </div>
            )}
        </div>

        {error && (
          <span className={cn('text-sm', themeConfig?.field?.error)}>
            {error}
          </span>
        )}

        <Button
          type="button"
          onClick={handleContactContinue}
          disabled={disabled || !isNameValid || !isEmailValid || !isPhoneValid}
          className={cn(
            'h-12 rounded-xl w-full mt-2 font-semibold',
            themeConfig?.button?.primary,
          )}
          style={{ backgroundColor: primaryColor }}
        >
          Continue
        </Button>
      </div>
    );
  }

  // Shipping Address Step
  if (currentStep === 'shipping') {
    return (
      <div className="flex flex-col gap-4 w-full">
        {/* Progress indicator and back button */}
        <div className="relative flex flex-col items-center mb-2 w-full">
          {currentStepIndex > 0 && (
            <button
              type="button"
              onClick={goToPreviousStep}
              className="absolute left-0 top-0 text-sm underline h-full flex items-start cursor-pointer"
              style={{ color: primaryColor }}
            >
              Back
            </button>
          )}
          <div className="flex flex-col items-center gap-1.5">
            <span
              className="text-sm font-semibold uppercase tracking-wider whitespace-nowrap"
              style={{ color: themeConfig?.colors?.text, opacity: 0.4 }}
            >
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            {/* Progress Bar */}
            <div className="w-24 h-1.5 mt-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
                  backgroundColor: primaryColor,
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-2 mb-2"
          style={{ color: themeConfig?.colors?.text }}
        >
          <MapPin className="w-5 h-5" style={{ color: primaryColor }} />
          <span className={themeConfig.field.label}>Shipping Address</span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={formData.shippingAddress.firstName}
              onChange={(e) =>
                handleAddressChange(
                  'shippingAddress',
                  'firstName',
                  e.target.value,
                )
              }
              placeholder="First name"
              className={themeConfig.field.input}
              disabled={disabled}
              autoFocus
            />
            <Input
              value={formData.shippingAddress.lastName}
              onChange={(e) =>
                handleAddressChange(
                  'shippingAddress',
                  'lastName',
                  e.target.value,
                )
              }
              placeholder="Last name"
              className={themeConfig.field.input}
              disabled={disabled}
            />
          </div>

          <Input
            value={formData.shippingAddress.company}
            onChange={(e) =>
              handleAddressChange('shippingAddress', 'company', e.target.value)
            }
            placeholder="Company (optional)"
            className={themeConfig.field.input}
            disabled={disabled}
          />

          <Input
            value={formData.shippingAddress.address1}
            onChange={(e) =>
              handleAddressChange('shippingAddress', 'address1', e.target.value)
            }
            placeholder="Address"
            className={themeConfig.field.input}
            disabled={disabled}
          />

          <Input
            value={formData.shippingAddress.address2}
            onChange={(e) =>
              handleAddressChange('shippingAddress', 'address2', e.target.value)
            }
            placeholder="Apartment, suite, etc. (optional)"
            className={themeConfig.field.input}
            disabled={disabled}
          />

          <Select
            value={formData.shippingAddress.country}
            onValueChange={(val) =>
              handleAddressChange('shippingAddress', 'country', val)
            }
            disabled={disabled}
          >
            <SelectTrigger className={themeConfig.field.select}>
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            className={cn(
              'grid gap-2',
              formData.shippingAddress.country === 'US'
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2',
            )}
          >
            <Input
              value={formData.shippingAddress.city}
              onChange={(e) =>
                handleAddressChange('shippingAddress', 'city', e.target.value)
              }
              placeholder="City"
              className={cn(
                themeConfig.field.input,
                formData.shippingAddress.country === 'US'
                  ? 'col-span-2 sm:col-span-1'
                  : '',
              )}
              disabled={disabled}
            />

            {formData.shippingAddress.country === 'US' && (
              <Select
                value={formData.shippingAddress.state}
                onValueChange={(val) =>
                  handleAddressChange('shippingAddress', 'state', val)
                }
                disabled={disabled}
              >
                <SelectTrigger className={cn(themeConfig.field.select)}>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {usStates.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Input
              value={formData.shippingAddress.zip}
              onChange={(e) =>
                handleAddressChange('shippingAddress', 'zip', e.target.value)
              }
              placeholder="ZIP"
              className={themeConfig.field.input}
              disabled={disabled}
            />
          </div>
        </div>

        {block.showBillingAddress && (
          <button
            type="button"
            onClick={() =>
              setFormData((prev) => ({
                ...prev,
                billingIsSame: !prev.billingIsSame,
              }))
            }
            disabled={disabled}
            className={cn(
              'flex items-center gap-2 w-full',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
            style={{
              borderColor: formData.billingIsSame ? primaryColor : undefined,
            }}
          >
            <div
              className={cn(
                'p-1',
                themeConfig.field.checkbox,
                'flex items-center justify-center',
              )}
              style={{
                borderColor: formData.billingIsSame
                  ? primaryColor
                  : themeConfig?.colors?.border,
              }}
            >
              {formData.billingIsSame && (
                <Check
                  className="w-full h-full"
                  style={{ color: primaryColor }}
                />
              )}
            </div>
            <span
              className={cn(
                'text-left transition-colors mb-0',
                themeConfig?.field?.label,
              )}
              style={{
                color: formData.billingIsSame
                  ? primaryColor
                  : themeConfig?.colors?.text,
                marginBottom: 0,
              }}
            >
              Shipping and billing address are the same
            </span>
          </button>
        )}

        {/* Inform user that billing will be collected next when sameAsBilling is unchecked */}
        {block.showBillingAddress && !formData.billingIsSame && (
          <div
            className="text-sm px-1 -mt-1 opacity-70"
            style={{ color: themeConfig?.colors?.text }}
          >
            We&apos;ll collect your billing address in the next step.
          </div>
        )}

        {error && (
          <span className={cn(themeConfig?.field?.error)}>{error}</span>
        )}

        <Button
          type="button"
          onClick={goToNextStep}
          disabled={
            disabled ||
            !formData.shippingAddress.address1 ||
            !formData.shippingAddress.city ||
            !formData.shippingAddress.zip ||
            (formData.shippingAddress.country === 'US' &&
              !formData.shippingAddress.state)
          }
          className={cn(
            'h-12 rounded-xl w-full mt-2 font-semibold',
            themeConfig?.button?.primary,
          )}
          style={{ backgroundColor: primaryColor }}
        >
          Continue
        </Button>
      </div>
    );
  }

  // Billing Address Step
  if (currentStep === 'billing') {
    return (
      <div className="flex flex-col gap-4 w-full">
        {/* Progress indicator and back button */}
        <div className="relative flex flex-col items-center mb-2 w-full">
          {currentStepIndex > 0 && (
            <button
              type="button"
              onClick={goToPreviousStep}
              className="absolute left-0 top-0 text-sm underline h-full flex items-start cursor-pointer"
              style={{ color: primaryColor }}
            >
              Back
            </button>
          )}
          <div className="flex flex-col items-center gap-1.5">
            <span
              className="text-sm font-semibold uppercase tracking-wider whitespace-nowrap"
              style={{ color: themeConfig?.colors?.text, opacity: 0.4 }}
            >
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
            {/* Progress Bar */}
            <div className="w-24 h-1.5 mt-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  width: `${((currentStepIndex + 1) / totalSteps) * 100}%`,
                  backgroundColor: primaryColor,
                }}
              />
            </div>
          </div>
        </div>

        <div
          className="flex items-center gap-2 mb-2"
          style={{ color: themeConfig?.colors?.text }}
        >
          <Building className="w-5 h-5" style={{ color: primaryColor }} />
          <span className={themeConfig.field.label}>Billing Address</span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              value={formData.billingAddress.firstName}
              onChange={(e) =>
                handleAddressChange(
                  'billingAddress',
                  'firstName',
                  e.target.value,
                )
              }
              placeholder="First name"
              className={themeConfig.field.input}
              disabled={disabled}
            />
            <Input
              value={formData.billingAddress.lastName}
              onChange={(e) =>
                handleAddressChange(
                  'billingAddress',
                  'lastName',
                  e.target.value,
                )
              }
              placeholder="Last name"
              className={themeConfig.field.input}
              disabled={disabled}
            />
          </div>

          <Input
            value={formData.billingAddress.company}
            onChange={(e) =>
              handleAddressChange('billingAddress', 'company', e.target.value)
            }
            placeholder="Company (optional)"
            className={themeConfig.field.input}
            disabled={disabled}
          />

          <Input
            value={formData.billingAddress.address1}
            onChange={(e) =>
              handleAddressChange('billingAddress', 'address1', e.target.value)
            }
            placeholder="Address"
            className={themeConfig.field.input}
            disabled={disabled}
          />

          <Input
            value={formData.billingAddress.address2}
            onChange={(e) =>
              handleAddressChange('billingAddress', 'address2', e.target.value)
            }
            placeholder="Apartment, suite, etc. (optional)"
            className={themeConfig.field.input}
            disabled={disabled}
          />

          <Select
            value={formData.billingAddress.country}
            onValueChange={(val) =>
              handleAddressChange('billingAddress', 'country', val)
            }
            disabled={disabled}
          >
            <SelectTrigger className={themeConfig.field.select}>
              <SelectValue placeholder="Country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map((country) => (
                <SelectItem key={country.code} value={country.code}>
                  {country.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div
            className={cn(
              'grid gap-2',
              formData.billingAddress.country === 'US'
                ? 'grid-cols-2 sm:grid-cols-3'
                : 'grid-cols-2',
            )}
          >
            <Input
              value={formData.billingAddress.city}
              onChange={(e) =>
                handleAddressChange('billingAddress', 'city', e.target.value)
              }
              placeholder="City"
              className={cn(
                themeConfig.field.input,
                formData.billingAddress.country === 'US'
                  ? 'col-span-2 sm:col-span-1'
                  : '',
              )}
              disabled={disabled}
            />

            {formData.billingAddress.country === 'US' && (
              <Select
                value={formData.billingAddress.state}
                onValueChange={(val) =>
                  handleAddressChange('billingAddress', 'state', val)
                }
                disabled={disabled}
              >
                <SelectTrigger className={themeConfig.field.select}>
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {usStates.map((state) => (
                    <SelectItem key={state.code} value={state.code}>
                      {state.code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Input
              value={formData.billingAddress.zip}
              onChange={(e) =>
                handleAddressChange('billingAddress', 'zip', e.target.value)
              }
              placeholder="ZIP"
              className={themeConfig.field.input}
              disabled={disabled}
            />
          </div>
        </div>

        {error && (
          <span className={cn('text-sm', themeConfig?.field?.error)}>
            {error}
          </span>
        )}

        <Button
          type="button"
          onClick={goToNextStep}
          disabled={
            disabled ||
            (!formData.billingIsSame &&
              (!formData.billingAddress.address1 ||
                !formData.billingAddress.city ||
                !formData.billingAddress.zip ||
                (formData.billingAddress.country === 'US' &&
                  !formData.billingAddress.state)))
          }
          className={cn(
            'h-12 rounded-xl w-full mt-2 font-semibold',
            themeConfig?.button?.primary,
          )}
          style={{ backgroundColor: primaryColor }}
        >
          Continue
        </Button>
      </div>
    );
  }

  return null;
};

export const CheckoutBlock: BlockDefinition = {
  type: 'checkout',
  name: 'Checkout Form',
  description:
    'Collect shipping, billing and contact details with Shopify-like experience',
  icon: React.createElement(ShoppingCart, { className: 'w-4 h-4' }),
  defaultData: {
    type: 'checkout',
    fieldName: generateFieldName('checkout'),
    label: 'Checkout Information',
    description: 'Please provide your contact and shipping details',
    showContactInfo: true,
    showShippingAddress: true,
    showBillingAddress: false,
    sameAsBilling: true,
    requireEmail: true,
    requirePhone: true,
    collectFullName: true,
    allowCompany: false,
    defaultCountry: 'US',
    className: '',
  },
  generateDefaultData: () => ({
    type: 'checkout',
    fieldName: generateFieldName('checkout'),
    label: 'Checkout Information',
    description: 'Please provide your contact and shipping details',
    showContactInfo: true,
    showShippingAddress: true,
    showBillingAddress: false,
    sameAsBilling: true,
    requireEmail: true,
    requirePhone: true,
    collectFullName: true,
    allowCompany: false,
    defaultCountry: 'US',
    className: '',
  }),
  renderItem: (props) => <CheckoutBlockItem {...props} />,
  renderFormFields: (props) => <CheckoutBlockForm {...props} />,
  renderPreview: () => <CheckoutBlockPreview />,
  renderBlock: (props) => <CheckoutRenderer {...props} />,
  chatRenderer: (props) => <CheckoutChatRenderer {...props} />,
  validate: (data) => {
    if (!data.fieldName) return 'Field name is required';
    return null;
  },
  // Input schema - describes expected input data structure for AI agents
  inputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        optional: true,
        description: 'Customer email address',
      },
      phone: {
        type: 'string',
        optional: true,
        description: 'Customer phone number',
      },
      firstName: {
        type: 'string',
        optional: true,
        description: 'First name for shipping',
      },
      lastName: {
        type: 'string',
        optional: true,
        description: 'Last name for shipping',
      },
      company: {
        type: 'string',
        optional: true,
        description: 'Company name (optional)',
      },
      address1: {
        type: 'string',
        optional: true,
        description: 'Street address line 1',
      },
      address2: {
        type: 'string',
        optional: true,
        description: 'Street address line 2 (optional)',
      },
      city: { type: 'string', optional: true, description: 'City name' },
      state: {
        type: 'string',
        optional: true,
        description: 'State/Province code',
      },
      zip: { type: 'string', optional: true, description: 'ZIP/Postal code' },
      country: {
        type: 'string',
        optional: true,
        description: 'Country code (e.g., US, CA)',
      },
    },
  },
  // Output schema - this block returns comprehensive checkout information
  outputSchema: {
    type: 'object',
    properties: {
      email: {
        type: 'string',
        optional: true,
        description: 'Customer email address',
      },
      phone: {
        type: 'string',
        optional: true,
        description: 'Customer phone number',
      },
      firstName: { type: 'string', optional: true, description: 'First name' },
      lastName: { type: 'string', optional: true, description: 'Last name' },
      fullName: { type: 'string', optional: true, description: 'Full name' },
      company: { type: 'string', optional: true, description: 'Company name' },
      shippingAddress: {
        type: 'object',
        optional: true,
        description: 'Shipping address details',
      },
      billingAddress: {
        type: 'object',
        optional: true,
        description: 'Billing address details',
      },
    },
  },
  fieldConfig: {
    enabled: true,
    label: "Field Name",
    required: true
  }
};
