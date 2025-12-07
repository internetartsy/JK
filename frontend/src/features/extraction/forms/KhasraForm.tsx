import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { khasraSchema, khasraDefaults, khasraLabels } from '../schemas/khasra.schema';
import type { KhasraFormData } from '../schemas/khasra.schema';
import { TransliterationHint } from '../../transliteration/TransliterationHint';

interface FieldConfidence {
    field: string;
    confidence: number;
}

interface KhasraFormProps {
    initialData?: Partial<KhasraFormData>;
    fieldConfidences?: FieldConfidence[];
    onSubmit: (data: KhasraFormData) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function KhasraForm({
    initialData,
    fieldConfidences = [],
    onSubmit,
    onCancel,
    isSubmitting = false,
}: KhasraFormProps) {
    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
        watch,
    } = useForm<KhasraFormData>({
        resolver: zodResolver(khasraSchema) as any, // Type assertion to bypass zod version mismatch
        defaultValues: { ...khasraDefaults, ...initialData } as KhasraFormData,
    });

    const { fields: ownerFields, append: addOwner, remove: removeOwner } = useFieldArray({
        control,
        name: 'owner_names',
    });

    const getConfidence = (fieldName: string): number | undefined => {
        return fieldConfidences.find(f => f.field === fieldName)?.confidence;
    };

    const ConfidenceIndicator = ({ fieldName }: { fieldName: string }) => {
        const confidence = getConfidence(fieldName);
        if (confidence === undefined) return null;

        const color = confidence > 80 ? 'text-green-500' : confidence > 50 ? 'text-yellow-500' : 'text-red-500';

        return (
            <span className={`inline-flex items-center gap-1 text-xs ${color}`}>
                {confidence > 80 ? <CheckCircle className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {Math.round(confidence)}%
            </span>
        );
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Khasra Number */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        <span className="flex items-center justify-between">
                            {khasraLabels.khasra_number.en}
                            <ConfidenceIndicator fieldName="khasra_number" />
                        </span>
                        <span className="text-secondary-500 text-xs font-urdu">{khasraLabels.khasra_number.ur}</span>
                    </label>
                    <input
                        {...register('khasra_number')}
                        className="input"
                        placeholder="e.g., 123/2"
                    />
                    {errors.khasra_number && (
                        <p className="text-sm text-red-500 mt-1">{errors.khasra_number.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        {khasraLabels.khata_number.en}
                        <span className="text-secondary-500 text-xs font-urdu ml-2">{khasraLabels.khata_number.ur}</span>
                    </label>
                    <input
                        {...register('khata_number')}
                        className="input"
                        placeholder="Account number"
                    />
                </div>
            </div>

            {/* Village & Halqa */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        <span className="flex items-center justify-between">
                            {khasraLabels.village.en}
                            <ConfidenceIndicator fieldName="village" />
                        </span>
                    </label>
                    <input
                        {...register('village')}
                        className="input font-urdu"
                        dir="rtl"
                        placeholder="گاؤں کا نام"
                    />
                    <TransliterationHint
                        text={watch('village') || ''}
                        onSelect={() => {
                            // Auto-fill English field if needed
                        }}
                    />
                    {errors.village && (
                        <p className="text-sm text-red-500 mt-1">{errors.village.message}</p>
                    )}
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        {khasraLabels.village_english.en}
                    </label>
                    <input
                        {...register('village_english')}
                        className="input"
                        placeholder="Village name in English"
                    />
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        {khasraLabels.halqa.en}
                        <span className="text-secondary-500 text-xs font-urdu ml-2">{khasraLabels.halqa.ur}</span>
                    </label>
                    <input
                        {...register('halqa')}
                        className="input"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        {khasraLabels.tehsil.en}
                    </label>
                    <input
                        {...register('tehsil')}
                        className="input"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        {khasraLabels.district.en}
                    </label>
                    <input
                        {...register('district')}
                        className="input"
                    />
                </div>
            </div>

            {/* Owners Section */}
            <div className="border border-secondary-200 dark:border-secondary-700 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-secondary-900 dark:text-secondary-100">
                        {khasraLabels.owner_names.en}
                        <span className="text-secondary-500 text-sm font-urdu ml-2">{khasraLabels.owner_names.ur}</span>
                    </h3>
                    <button
                        type="button"
                        onClick={() => addOwner({ name_urdu: '', name_english: '', father_name: '' })}
                        className="btn btn-secondary text-sm flex items-center gap-1"
                    >
                        <Plus className="w-4 h-4" />
                        Add Owner
                    </button>
                </div>

                {ownerFields.map((field, index) => (
                    <div key={field.id} className="grid grid-cols-4 gap-3 mb-3 p-3 bg-secondary-50 dark:bg-secondary-800 rounded-lg">
                        <div>
                            <input
                                {...register(`owner_names.${index}.name_urdu`)}
                                className="input font-urdu text-sm"
                                dir="rtl"
                                placeholder="نام (اردو)"
                            />
                        </div>
                        <div>
                            <input
                                {...register(`owner_names.${index}.name_english`)}
                                className="input text-sm"
                                placeholder="Name (English)"
                            />
                        </div>
                        <div>
                            <input
                                {...register(`owner_names.${index}.father_name`)}
                                className="input font-urdu text-sm"
                                dir="rtl"
                                placeholder="ولد"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                {...register(`owner_names.${index}.share_percentage`)}
                                type="number"
                                min="0"
                                max="100"
                                className="input text-sm w-20"
                                placeholder="%"
                            />
                            {ownerFields.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeOwner(index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                {errors.owner_names && (
                    <p className="text-sm text-red-500">{errors.owner_names.message}</p>
                )}
            </div>

            {/* Area & Land Type */}
            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        <span className="flex items-center justify-between">
                            {khasraLabels.total_area.en}
                            <ConfidenceIndicator fieldName="total_area" />
                        </span>
                    </label>
                    <div className="flex gap-2">
                        <input
                            {...register('total_area')}
                            type="number"
                            step="0.01"
                            className="input flex-1"
                            placeholder="0.00"
                        />
                        <select {...register('area_unit')} className="input w-28">
                            <option value="kanal">Kanal</option>
                            <option value="marla">Marla</option>
                            <option value="acre">Acre</option>
                            <option value="hectare">Hectare</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        {khasraLabels.land_type.en}
                    </label>
                    <select {...register('land_type')} className="input">
                        <option value="">Select...</option>
                        <option value="agricultural">Agricultural</option>
                        <option value="residential">Residential</option>
                        <option value="commercial">Commercial</option>
                        <option value="barren">Barren</option>
                        <option value="forest">Forest</option>
                        <option value="other">Other</option>
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                        {khasraLabels.irrigation_type.en}
                    </label>
                    <select {...register('irrigation_type')} className="input">
                        <option value="">Select...</option>
                        <option value="canal">Canal</option>
                        <option value="tubewell">Tubewell</option>
                        <option value="rainfed">Rainfed</option>
                        <option value="none">None</option>
                    </select>
                </div>
            </div>

            {/* Notes */}
            <div>
                <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-1">
                    {khasraLabels.notes.en}
                </label>
                <textarea
                    {...register('notes')}
                    rows={3}
                    className="input resize-none"
                    placeholder="Additional notes..."
                />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-4 pt-4 border-t border-secondary-200 dark:border-secondary-700">
                <button
                    type="button"
                    onClick={onCancel}
                    className="btn btn-secondary"
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Saving...' : 'Save & Continue'}
                </button>
            </div>
        </form>
    );
}

export default KhasraForm;
