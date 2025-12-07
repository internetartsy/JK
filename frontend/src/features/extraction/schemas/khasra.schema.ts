import { z } from 'zod';

// Common field validators
const englishTextSchema = z.string().regex(
    /^[a-zA-Z\s\d]+$/,
    'Must contain only English characters'
).optional();

const mixedTextSchema = z.string().min(1, 'Required');

const areaNumberSchema = z.coerce.number()
    .positive('Area must be positive')
    .optional();

const areaUnitSchema = z.enum(['kanal', 'marla', 'acre', 'hectare'])
    .optional();

// Khasra document schema
export const khasraSchema = z.object({
    khasra_number: z.string()
        .min(1, 'Khasra number is required')
        .regex(/^[\d\/\-]+$/, 'Invalid khasra number format'),

    village: mixedTextSchema.describe('Village name (گاؤں)'),

    village_english: englishTextSchema.describe('Village name in English'),

    halqa: mixedTextSchema.optional().describe('Halqa/Circle (حلقہ)'),

    tehsil: mixedTextSchema.optional().describe('Tehsil'),

    district: mixedTextSchema.optional().describe('District'),

    owner_names: z.array(z.object({
        name_urdu: z.string().min(1, 'Owner name required'),
        name_english: z.string().optional(),
        father_name: z.string().optional(),
        share_percentage: z.coerce.number().min(0).max(100).optional(),
    })).min(1, 'At least one owner is required'),

    total_area: areaNumberSchema.describe('Total area'),

    area_unit: areaUnitSchema,

    khata_number: z.string().optional().describe('Khata/Account number (کھاتہ)'),

    hadbast_number: z.string().optional().describe('Hadbast number'),

    land_type: z.enum([
        'agricultural',
        'residential',
        'commercial',
        'barren',
        'forest',
        'other'
    ]).optional(),

    irrigation_type: z.enum([
        'canal',
        'tubewell',
        'rainfed',
        'none'
    ]).optional(),

    notes: z.string().optional(),
});

export type KhasraFormData = z.infer<typeof khasraSchema>;

// Default values for Khasra form
export const khasraDefaults: Partial<KhasraFormData> = {
    owner_names: [{ name_urdu: '', name_english: '', father_name: '' }],
    area_unit: 'kanal',
    land_type: 'agricultural',
};

// Field labels for Khasra (bilingual)
export const khasraLabels: Record<keyof KhasraFormData, { en: string; ur: string }> = {
    khasra_number: { en: 'Khasra Number', ur: 'خسرہ نمبر' },
    village: { en: 'Village', ur: 'گاؤں' },
    village_english: { en: 'Village (English)', ur: 'گاؤں (انگریزی)' },
    halqa: { en: 'Halqa', ur: 'حلقہ' },
    tehsil: { en: 'Tehsil', ur: 'تحصیل' },
    district: { en: 'District', ur: 'ضلع' },
    owner_names: { en: 'Owners', ur: 'مالکان' },
    total_area: { en: 'Total Area', ur: 'کل رقبہ' },
    area_unit: { en: 'Unit', ur: 'اکائی' },
    khata_number: { en: 'Khata Number', ur: 'کھاتہ نمبر' },
    hadbast_number: { en: 'Hadbast Number', ur: 'حدباست نمبر' },
    land_type: { en: 'Land Type', ur: 'زمین کی قسم' },
    irrigation_type: { en: 'Irrigation', ur: 'آبپاشی' },
    notes: { en: 'Notes', ur: 'نوٹس' },
};
