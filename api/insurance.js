import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// 1リクエストあたりの推定費用（円）
// Gemini無料枠中は 0。有料API移行時に Vercel 環境変数 COST_PER_REQUEST_YEN で設定
const COST_PER_REQUEST_YEN = parseFloat(process.env.COST_PER_REQUEST_YEN || '0');

/**
 * 保険状態を取得する
 * @returns {{ registrationBlocked: boolean, freeLimitWarn: number, isWarningLevel: boolean, currentCostYen: number }}
 */
export async function getInsuranceStatus() {
  try {
    const yearMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const [{ data: config }, { data: cost }] = await Promise.all([
      supabase.from('insurance_config').select('*').eq('id', 1).maybeSingle(),
      supabase.from('monthly_api_costs').select('total_cost_yen').eq('year_month', yearMonth).maybeSingle(),
    ]);

    const currentCostYen = parseFloat(cost?.total_cost_yen ?? 0);
    const thresholdWarn = config?.threshold_warn_yen ?? 5000;
    const thresholdBlock = config?.threshold_block_yen ?? 10000;

    return {
      registrationBlocked: config?.registration_blocked ?? false,
      freeLimitWarn: config?.free_limit_warn ?? 3,
      isWarningLevel: currentCostYen >= thresholdWarn,
      isBlockLevel: currentCostYen >= thresholdBlock,
      currentCostYen,
    };
  } catch {
    // 取得失敗時はデフォルト（制限なし）で続行
    return {
      registrationBlocked: false,
      freeLimitWarn: 3,
      isWarningLevel: false,
      isBlockLevel: false,
      currentCostYen: 0,
    };
  }
}

/**
 * APIコストを月次テーブルに記録する（バックグラウンド用）
 * COST_PER_REQUEST_YEN が 0 の場合はスキップ（無料枠中）
 */
export async function recordApiCost() {
  if (COST_PER_REQUEST_YEN <= 0) return;
  try {
    const yearMonth = new Date().toISOString().slice(0, 7);
    await supabase.rpc('increment_api_cost', {
      p_year_month: yearMonth,
      p_cost_yen: COST_PER_REQUEST_YEN,
    });
  } catch {
    // コスト記録失敗は無視（メイン処理を止めない）
  }
}
