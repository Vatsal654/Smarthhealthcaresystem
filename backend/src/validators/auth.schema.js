const { z } = require('zod');

const signupSchema = z
  .object({
    name: z.string().min(2).max(80),
    email: z.string().email().toLowerCase(),
    password: z.string().min(8).max(128),
    phone: z.string().min(6).max(20).optional(),
    role: z.enum(['patient', 'doctor']).default('patient'),
    doctor: z
      .object({
        specialization: z.string().min(2),
        degree: z.string().min(1),
        licenseNumber: z.string().min(2),
        yearsOfExperience: z.coerce.number().min(0).max(70).default(0),
        hospital: z.string().optional(),
        city: z.string().optional(),
        bio: z.string().max(1500).optional(),
        consultationFee: z.coerce.number().min(0).default(0),
        govtIdUrl: z.string().url().optional(),
        certificateUrl: z.string().url().optional(),
      })
      .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === 'doctor' && !data.doctor) {
      ctx.addIssue({
        path: ['doctor'],
        code: 'custom',
        message: 'Doctor profile fields are required for role=doctor',
      });
    }
  });

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

module.exports = { signupSchema, loginSchema };
