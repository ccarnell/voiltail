import { NextRequest, NextResponse } from 'next/server';
import { persistentCostTracker } from '@/lib/persistent-cost-tracking';

export async function GET(request: NextRequest) {
  try {
    // Get performance statistics
    const stats = persistentCostTracker.getPerformanceStats(7); // Last 7 days
    const validation = persistentCostTracker.validatePhase1Criteria();
    const totalCosts = persistentCostTracker.getTotalCosts(30); // Last 30 days
    const recommendations = generateRecommendations(validation, stats);
    
    // Check if request is from browser (wants HTML) or API call (wants JSON)
    const acceptHeader = request.headers.get('accept') || '';
    const wantsHtml = acceptHeader.includes('text/html');
    
    if (wantsHtml) {
      // Return clean HTML dashboard
      const html = generateHtmlDashboard(validation, stats, totalCosts, recommendations);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    // Return JSON for API calls
    return NextResponse.json({
      phase1Validation: {
        sophisticatedSynthesisTime: {
          passed: validation.sophisticatedSynthesisTime,
          target: '<50 seconds',
          actual: `${validation.avgTime.toFixed(1)} seconds`,
          status: validation.sophisticatedSynthesisTime ? 'PASS' : 'FAIL'
        },
        costPerQuery: {
          passed: validation.costPerQuery,
          target: '<$0.15',
          actual: `$${validation.avgCost.toFixed(4)}`,
          status: validation.costPerQuery ? 'PASS' : 'FAIL'
        }
      },
      performanceStats: {
        basic: {
          averageCost: stats.basic.avgCost,
          averageTime: Math.round(stats.basic.avgTime / 1000), // Convert to seconds
          queryCount: stats.basic.count
        },
        pro: {
          averageCost: stats.pro.avgCost,
          averageTime: Math.round(stats.pro.avgTime / 1000), // Convert to seconds
          queryCount: stats.pro.count
        }
      },
      costSummary: {
        last30Days: {
          basic: totalCosts.basic,
          pro: totalCosts.pro,
          total: totalCosts.total
        }
      },
      recommendations
    });
  } catch (error) {
    console.error('Cost validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate costs' },
      { status: 500 }
    );
  }
}

function generateHtmlDashboard(
  validation: ReturnType<typeof persistentCostTracker.validatePhase1Criteria>,
  stats: ReturnType<typeof persistentCostTracker.getPerformanceStats>,
  totalCosts: ReturnType<typeof persistentCostTracker.getTotalCosts>,
  recommendations: string[]
): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Voiltail Cost Tracking</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #000;
            color: #e5e7eb;
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 1px solid #374151;
            padding-bottom: 20px;
        }
        .header h1 {
            color: #fff;
            margin: 0;
            font-size: 2rem;
        }
        .subtitle {
            color: #9ca3af;
            margin: 5px 0 0 0;
        }
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .card {
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 8px;
            padding: 20px;
        }
        .card h3 {
            color: #fff;
            margin: 0 0 15px 0;
            font-size: 1.2rem;
        }
        .status-pass {
            color: #10b981;
            font-weight: bold;
        }
        .status-fail {
            color: #ef4444;
            font-weight: bold;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid #374151;
        }
        .metric:last-child {
            border-bottom: none;
        }
        .metric-label {
            color: #9ca3af;
        }
        .metric-value {
            color: #fff;
            font-weight: 500;
        }
        .recommendations {
            background: #1f2937;
            border: 1px solid #374151;
            border-radius: 8px;
            padding: 20px;
            margin-top: 20px;
        }
        .recommendations h3 {
            color: #fff;
            margin: 0 0 15px 0;
        }
        .recommendation {
            margin: 10px 0;
            padding: 10px;
            background: #111827;
            border-radius: 4px;
            border-left: 3px solid #06b6d4;
        }
        .refresh-btn {
            background: #06b6d4;
            color: #000;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            margin-top: 20px;
        }
        .refresh-btn:hover {
            background: #0891b2;
        }
        .timestamp {
            text-align: center;
            color: #6b7280;
            font-size: 0.9rem;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Voiltail Cost Tracking</h1>
            <p class="subtitle">Phase 1 Performance Monitoring & Validation</p>
        </div>

        <div class="grid">
            <div class="card">
                <h3>Phase 1 Validation</h3>
                <div class="metric">
                    <span class="metric-label">Synthesis Time</span>
                    <span class="metric-value ${validation.sophisticatedSynthesisTime ? 'status-pass' : 'status-fail'}">
                        ${validation.avgTime.toFixed(1)}s ${validation.sophisticatedSynthesisTime ? '✅' : '❌'}
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Target</span>
                    <span class="metric-value">&lt; 50 seconds</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Cost Per Query</span>
                    <span class="metric-value ${validation.costPerQuery ? 'status-pass' : 'status-fail'}">
                        $${validation.avgCost.toFixed(4)} ${validation.costPerQuery ? '✅' : '❌'}
                    </span>
                </div>
                <div class="metric">
                    <span class="metric-label">Target</span>
                    <span class="metric-value">&lt; $0.15</span>
                </div>
            </div>

            <div class="card">
                <h3>Basic Mode (7 days)</h3>
                <div class="metric">
                    <span class="metric-label">Query Count</span>
                    <span class="metric-value">${stats.basic.count}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Cost</span>
                    <span class="metric-value">$${stats.basic.avgCost.toFixed(4)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Time</span>
                    <span class="metric-value">${Math.round(stats.basic.avgTime / 1000)}s</span>
                </div>
            </div>

            <div class="card">
                <h3>Pro Mode (7 days)</h3>
                <div class="metric">
                    <span class="metric-label">Query Count</span>
                    <span class="metric-value">${stats.pro.count}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Cost</span>
                    <span class="metric-value">$${stats.pro.avgCost.toFixed(4)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Avg Time</span>
                    <span class="metric-value">${Math.round(stats.pro.avgTime / 1000)}s</span>
                </div>
            </div>

            <div class="card">
                <h3>Cost Summary (30 days)</h3>
                <div class="metric">
                    <span class="metric-label">Basic Mode</span>
                    <span class="metric-value">$${totalCosts.basic.toFixed(4)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Pro Mode</span>
                    <span class="metric-value">$${totalCosts.pro.toFixed(4)}</span>
                </div>
                <div class="metric">
                    <span class="metric-label">Total</span>
                    <span class="metric-value">$${totalCosts.total.toFixed(4)}</span>
                </div>
            </div>
        </div>

        <div class="recommendations">
            <h3>Recommendations</h3>
            ${recommendations.map(rec => `<div class="recommendation">${rec}</div>`).join('')}
        </div>

        <div style="text-align: center;">
            <button class="refresh-btn" onclick="window.location.reload()">Refresh Data</button>
        </div>

        <div class="timestamp">
            Last updated: ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>`;
}

function generateRecommendations(
  validation: ReturnType<typeof persistentCostTracker.validatePhase1Criteria>,
  stats: ReturnType<typeof persistentCostTracker.getPerformanceStats>
): string[] {
  const recommendations: string[] = [];
  
  // Time recommendations
  if (!validation.sophisticatedSynthesisTime) {
    recommendations.push(
      `⚠️ Sophisticated synthesis averaging ${validation.avgTime.toFixed(1)}s exceeds 50s target. Consider optimizing model calls or reducing synthesis complexity.`
    );
  } else {
    recommendations.push(
      `✅ Synthesis time of ${validation.avgTime.toFixed(1)}s is within target (<50s).`
    );
  }
  
  // Cost recommendations
  if (!validation.costPerQuery) {
    recommendations.push(
      `⚠️ Average cost of $${validation.avgCost.toFixed(4)} exceeds $0.15 target. Consider optimizing model usage or adjusting pricing.`
    );
  } else {
    recommendations.push(
      `✅ Average cost of $${validation.avgCost.toFixed(4)} is within target (<$0.15).`
    );
  }
  
  // Usage pattern recommendations
  if (stats.pro.count > 0 && stats.basic.count > 0) {
    const proToBasicRatio = stats.pro.count / stats.basic.count;
    if (proToBasicRatio > 2) {
      recommendations.push(
        `📊 High Pro mode usage (${proToBasicRatio.toFixed(1)}:1 ratio). Consider Pro tier pricing optimization.`
      );
    } else if (proToBasicRatio < 0.5) {
      recommendations.push(
        `📊 Low Pro mode adoption (${proToBasicRatio.toFixed(1)}:1 ratio). Consider improving Pro mode value proposition.`
      );
    }
  }
  
  // Performance recommendations
  if (stats.pro.avgTime > 0 && stats.basic.avgTime > 0) {
    const timeRatio = stats.pro.avgTime / stats.basic.avgTime;
    if (timeRatio > 5) {
      recommendations.push(
        `⏱️ Pro mode is ${timeRatio.toFixed(1)}x slower than Basic. Consider streaming optimizations.`
      );
    }
  }
  
  return recommendations;
}

// POST endpoint to manually track a query (for testing)
export async function POST(request: Request) {
  try {
    const { tier, processingTime, modelCount = 3 } = await request.json();
    
    if (!tier || !processingTime) {
      return NextResponse.json(
        { error: 'tier and processingTime are required' },
        { status: 400 }
      );
    }
    
    const cost = persistentCostTracker.trackQuery(tier, processingTime);
    
    return NextResponse.json({
      message: 'Query tracked successfully',
      cost: {
        tier,
        total: cost.total,
        processingTime,
        modelCount
      }
    });
  } catch (error) {
    console.error('Manual cost tracking error:', error);
    return NextResponse.json(
      { error: 'Failed to track query' },
      { status: 500 }
    );
  }
}
