import supabase from '../config/supabase.js';

/**
 * Update RevenueCat customer ID for a user
 */
export const updateRevenueCatCustomerId = async (req, res) => {
    try {
        const userId = req.user.id;
        const { revenuecat_customer_id } = req.body;

        console.log('═══════════════════════════════════════════════════════');
        console.log('🔗 SYNCING REVENUECAT CUSTOMER ID');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`User ID: ${userId}`);
        console.log(`RevenueCat Customer ID: ${revenuecat_customer_id}`);

        if (!revenuecat_customer_id) {
            return res.status(400).json({ error: 'revenuecat_customer_id is required' });
        }

        const { data, error } = await supabase
            .from('user_profiles')
            .update({
                revenuecat_customer_id,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select('id, email, revenuecat_customer_id')
            .single();

        if (error) {
            console.error('❌ Failed to update RevenueCat customer ID:', error);
            return res.status(500).json({ error: 'Failed to update RevenueCat customer ID' });
        }

        console.log('✅ RevenueCat customer ID synced successfully');
        console.log(`   Database User ID: ${data.id}`);
        console.log(`   Email: ${data.email}`);
        console.log(`   RevenueCat Customer ID: ${data.revenuecat_customer_id}`);
        console.log('═══════════════════════════════════════════════════════');

        res.json({
            success: true,
            message: 'RevenueCat customer ID updated',
            data: {
                user_id: data.id,
                revenuecat_customer_id: data.revenuecat_customer_id
            }
        });
    } catch (error) {
        console.error('❌ Error updating RevenueCat customer ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export default {
    updateRevenueCatCustomerId
};
