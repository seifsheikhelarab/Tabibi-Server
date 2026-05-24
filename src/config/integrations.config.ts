import { v2 as cloudinary } from 'cloudinary';
import Razorpay from 'razorpay';
import Stripe from 'stripe';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env.config.js';

let razorpayInstance: Razorpay | null = null;
let stripeInstance: Stripe | null = null;
let geminiInstance: GoogleGenerativeAI | null = null;

export function initCloudinary() {
    if (env.cloudinaryName && env.cloudinaryApiKey && env.cloudinarySecretKey) {
        cloudinary.config({
            cloud_name: env.cloudinaryName,
            api_key: env.cloudinaryApiKey,
            api_secret: env.cloudinarySecretKey
        });
    }
}

export function getCloudinary() {
    return cloudinary;
}

export function initRazorpay() {
    if (env.razorpayKeyId && env.razorpayKeySecret) {
        razorpayInstance = new Razorpay({
            key_id: env.razorpayKeyId,
            key_secret: env.razorpayKeySecret
        });
    }
    return razorpayInstance;
}

export function getRazorpay() {
    if (!razorpayInstance) {
        return initRazorpay();
    }
    return razorpayInstance;
}

export function initStripe() {
    if (env.stripeSecretKey) {
        stripeInstance = new Stripe(env.stripeSecretKey, {
            apiVersion: '2026-04-22.dahlia'
        });
    }
    return stripeInstance;
}

export function getStripe() {
    if (!stripeInstance) {
        return initStripe();
    }
    return stripeInstance;
}

export function initGemini() {
    if (env.geminiApiKey) {
        geminiInstance = new GoogleGenerativeAI(env.geminiApiKey);
    }
    return geminiInstance;
}

export function getGemini() {
    if (!geminiInstance) {
        return initGemini();
    }
    return geminiInstance;
}

export function getStripeWebhookSecret() {
    return env.stripeWebhookSecret;
}