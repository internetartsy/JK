import { z } from 'zod';

// Girdawari (Crop Inspection) document schema
export const girdawariSchema = z.object({
    khasra_number: z.string()
        .min(1, 'Khasra number is required')
        .regex(/^[\d\/\-]+$/, 'Invalid khasra number format'),

    village: z.string().min(1, 'Village name is required'),

    village_english: z.string().optional(),

    owner_name: z.string().min(1, 'Owner name is required'),

    owner_name_english: z.string().optional(),

    father_name: z.string().optional(),

    father_name_english: z.string().optional(),

    cultivator_name: z.string().optional(),

    cultivator_name_english: z.string().optional(),

    cultivated_area: z.coerce.number()
        .positive('Area must be positive')
        .optional(),

    area_unit: z.enum(['kanal', 'marla', 'acre', 'hectare']).default('kanal'),

    crop: z.string().optional(),

    crop_english: z.string().optional(),

    season: z.enum(['kharif', 'rabi', 'zaid']).optional(),

    crop_year: z.string()
        .regex(/^\d{4}(-\d{4})?$/, 'Format: YYYY or YYYY-YYYY')
        .optional(),

    irrigation_type: z.enum([
        'canal',
        'tubewell',
        'rainfed',
        'well',
        'mixed',
        'none'
    ]).optional(),

    soil_type: z.enum([
        'alluvial',
        'black',
        'red',
        'sandy',
        'clay',
        'loamy',
        'other'
    ]).optional(),

    inspection_date: z.string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD')
        .optional(),

    inspector_name: z.string().optional(),

    patwari_name: z.string().optional(),

    remarks: z.string().optional(),

    // Crop health and yield
    crop_condition: z.enum(['excellent', 'good', 'average', 'poor', 'failed']).optional(),

    expected_yield: z.coerce.number().positive().optional(),

    yield_unit: z.enum(['maund', 'kg', 'quintal', 'ton']).optional(),
});

export type GirdawariFormData = z.infer<typeof girdawariSchema>;

// Default values for Girdawari form
export const girdawariDefaults: Partial<GirdawariFormData> = {
    area_unit: 'kanal',
    yield_unit: 'maund',
};

// Field labels for Girdawari (bilingual)
export const girdawariLabels: Record<keyof GirdawariFormData, { en: string; ur: string }> = {
    khasra_number: { en: 'Khasra Number', ur: 'خسرہ نمبر' },
    village: { en: 'Village', ur: 'گاؤں' },
    village_english: { en: 'Village (English)', ur: 'گاؤں (انگریزی)' },
    owner_name: { en: 'Owner Name', ur: 'مالک کا نام' },
    owner_name_english: { en: 'Owner (English)', ur: 'مالک (انگریزی)' },
    father_name: { en: 'Father\'s Name', ur: 'والد کا نام' },
    father_name_english: { en: 'Father (English)', ur: 'والد (انگریزی)' },
    cultivator_name: { en: 'Cultivator', ur: 'کاشتکار' },
    cultivator_name_english: { en: 'Cultivator (English)', ur: 'کاشتکار (انگریزی)' },
    cultivated_area: { en: 'Cultivated Area', ur: 'کاشت شدہ رقبہ' },
    area_unit: { en: 'Area Unit', ur: 'رقبہ کی اکائی' },
    crop: { en: 'Crop', ur: 'فصل' },
    crop_english: { en: 'Crop (English)', ur: 'فصل (انگریزی)' },
    season: { en: 'Season', ur: 'موسم' },
    crop_year: { en: 'Crop Year', ur: 'فصل کا سال' },
    irrigation_type: { en: 'Irrigation', ur: 'آبپاشی' },
    soil_type: { en: 'Soil Type', ur: 'مٹی کی قسم' },
    inspection_date: { en: 'Inspection Date', ur: 'معائنہ کی تاریخ' },
    inspector_name: { en: 'Inspector', ur: 'معائنہ کار' },
    patwari_name: { en: 'Patwari', ur: 'پٹواری' },
    remarks: { en: 'Remarks', ur: 'ملاحظات' },
    crop_condition: { en: 'Crop Condition', ur: 'فصل کی حالت' },
    expected_yield: { en: 'Expected Yield', ur: 'متوقع پیداوار' },
    yield_unit: { en: 'Yield Unit', ur: 'پیداوار کی اکائی' },
};

// Common crops dictionary (for validation and suggestions)
export const commonCrops: { ur: string; en: string; season: 'kharif' | 'rabi' | 'zaid' }[] = [
    { ur: 'گندم', en: 'Wheat', season: 'rabi' },
    { ur: 'چاول', en: 'Rice', season: 'kharif' },
    { ur: 'مکئی', en: 'Maize', season: 'kharif' },
    { ur: 'کپاس', en: 'Cotton', season: 'kharif' },
    { ur: 'گنا', en: 'Sugarcane', season: 'kharif' },
    { ur: 'سرسوں', en: 'Mustard', season: 'rabi' },
    { ur: 'چنا', en: 'Gram/Chickpea', season: 'rabi' },
    { ur: 'مسور', en: 'Lentils', season: 'rabi' },
    { ur: 'آلو', en: 'Potato', season: 'rabi' },
    { ur: 'پیاز', en: 'Onion', season: 'rabi' },
    { ur: 'ٹماٹر', en: 'Tomato', season: 'zaid' },
    { ur: 'بھنڈی', en: 'Okra', season: 'zaid' },
    { ur: 'تربوز', en: 'Watermelon', season: 'zaid' },
    { ur: 'خربوزہ', en: 'Melon', season: 'zaid' },
];
