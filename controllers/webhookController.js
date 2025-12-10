import { updateSubscriptionPlan } from '../services/supabaseService.js';

export const handleRevenueCatWebhook = async (req, res) => {
    try {
        const { event } = req.body;
        const authHeader = req.headers.authorization;

        // Log the full payload for debugging
        console.log('📦 Full webhook payload:', JSON.stringify(req.body, null, 2));

        // Verify webhook authorization
        const expectedSecret = `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET}`;
        if (authHeader !== expectedSecret) {
            console.error('❌ Unauthorized webhook request. Expected:', expectedSecret, 'Got:', authHeader);
            return res.status(401).json({ error: 'Unauthorized' });
        }
        console.log('✅ Webhook authorization verified');

        if (!event) {
            console.error('❌ No event in payload');
            return res.status(400).json({ error: 'Invalid payload' });
        }

        const { type, app_user_id, aliases } = event;

        console.log('═══════════════════════════════════════════════════════');
        console.log('🔔 REVENUECAT WEBHOOK EVENT RECEIVED');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`📋 Event Type: ${type}`);
        console.log(`👤 Customer ID (app_user_id): ${app_user_id}`);
        console.log(`🔗 Aliases: ${aliases ? JSON.stringify(aliases) : 'None'}`);
        console.log('');
        console.log('🔍 TO FIND THIS CUSTOMER IN REVENUECAT DASHBOARD:');
        console.log(`   1. Go to RevenueCat Dashboard → Customers`);
        console.log(`   2. Make sure you're in SANDBOX environment (top-right toggle)`);
        console.log(`   3. Search for: "${app_user_id}"`);
        console.log('═══════════════════════════════════════════════════════');

        // Skip anonymous users - they'll be synced when they log in
        // RevenueCat will transfer purchases when user calls Purchases.logIn()
        // Check if app_user_id is a valid UUID
        const isUuid = (id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

        let targetUserId = app_user_id;

        if (!isUuid(targetUserId)) {
            console.log(`⚠️ app_user_id '${targetUserId}' is not a UUID.`);

            // Try to find a UUID in aliases
            if (event.aliases && Array.isArray(event.aliases)) {
                const uuidAlias = event.aliases.find(alias => isUuid(alias));
                if (uuidAlias) {
                    console.log(`✅ Found UUID alias: ${uuidAlias}. Using this as target user ID.`);
                    targetUserId = uuidAlias;
                }
            }
        }

        if (!isUuid(targetUserId)) {
            console.log('⚠️ Could not find a valid UUID for user. Skipping database update.');
            // We return 200 so RevenueCat doesn't keep retrying, but we log the issue.
            return res.status(200).json({
                status: 'skipped',
                message: 'Anonymous user with no UUID alias - will sync on login'
            });
        }

        let newPlan = null;
        let newStatus = null;
        let productId = null;
        let planType = null;

        // Extract product_id from event if available
        if (event.product_id) {
            productId = event.product_id;
            console.log(`📦 Product ID: ${productId}`);

            // Determine plan type from product identifier
            const productLower = productId.toLowerCase();
            if (productLower.includes('weekly') || productLower.includes('week')) {
                planType = 'weekly';
            } else if (productLower.includes('monthly') || productLower.includes('month')) {
                planType = 'monthly';
            } else if (productLower.includes('yearly') || productLower.includes('annual') || productLower.includes('year')) {
                planType = 'yearly';
            }

            if (planType) {
                console.log(`📅 Detected plan type: ${planType}`);
            }
        }

        switch (type) {
            case 'TEST':
                // Handle test events from RevenueCat
                console.log('🧪 TEST event received - simulating premium upgrade');
                newPlan = 'unlimited';
                newStatus = 'active';
                break;
            case 'INITIAL_PURCHASE':
            case 'RENEWAL':
            case 'UNCANCELLATION':
                newPlan = 'unlimited';
                newStatus = 'active';
                break;
            case 'EXPIRATION':
                newPlan = 'free';
                newStatus = 'expired';
                break;
            case 'CANCELLATION':
                // For cancellation, we might want to keep them as premium until the period ends.
                // RevenueCat sends EXPIRATION when it actually ends.
                // So we keep plan as 'unlimited' but set status to 'cancelled' (no auto-renew)
                console.log(`User ${app_user_id} cancelled. Plan remains active until expiration.`);
                newPlan = 'unlimited';
                newStatus = 'cancelled';
                break;
            default:
                console.log(`⚠️ Unhandled event type: ${type}`);
        }

        if (newPlan) {
            console.log('');
            console.log('💾 DATABASE UPDATE:');
            console.log(`   Target User ID (UUID): ${targetUserId}`);
            console.log(`   RevenueCat Customer ID: ${app_user_id}`);
            console.log(`   New Plan: ${newPlan}`);
            console.log(`   New Status: ${newStatus}`);
            console.log(`   Product ID: ${productId || 'N/A'}`);
            console.log(`   Plan Type: ${planType || 'N/A'}`);
            if (targetUserId !== app_user_id) {
                console.log(`   ⚠️  Note: Using alias UUID instead of original app_user_id`);
            }

            try {
                // Pass the RevenueCat customer ID, product ID, and plan type to be stored in the database
                const result = await updateSubscriptionPlan(targetUserId, newPlan, newStatus, app_user_id, productId, planType);
                console.log('✅ Database updated successfully:', result);
                console.log('');
                console.log('🔗 CUSTOMER TRACKING:');
                console.log(`   Database User ID: ${targetUserId}`);
                console.log(`   RevenueCat Customer ID: ${app_user_id}`);
                console.log(`   You can now search for either ID in their respective systems`);
            } catch (dbError) {
                console.error('❌ Database update failed:', dbError);
                throw dbError;
            }
        } else {
            console.log('ℹ️ No plan update needed for this event type');
        }

        res.status(200).json({ status: 'success' });
    } catch (error) {
        console.error('❌ Webhook error:', error);
        console.error('Error details:', error.message, error.stack);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
