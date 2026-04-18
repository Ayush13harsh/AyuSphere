'use client';
import { useState } from 'react';
import Link from 'next/link';
import AppLayout from '../components/AppLayout';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function AnalyticsDashboard() {
    const [timeRange, setTimeRange] = useState('7d');

    // Mock Data for the charts
    const sosTriggerData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'SOS Alerts Triggered',
                data: [4, 6, 3, 8, 5, 2, 7],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#ef4444',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6,
            }
        ]
    };

    const conditionData = {
        labels: ['Cardiology', 'Neurology', 'Pulmonology', 'General'],
        datasets: [
            {
                data: [35, 20, 15, 30],
                backgroundColor: [
                    '#ef4444', // Red
                    '#3b82f6', // Blue
                    '#10b981', // Green
                    '#f59e0b', // Amber
                ],
                borderWidth: 0,
                hoverOffset: 8
            }
        ]
    };

    const responseTimeData = {
        labels: ['Zone A', 'Zone B', 'Zone C', 'Zone D'],
        datasets: [
            {
                label: 'Avg Response Time (mins)',
                data: [12, 18, 9, 24],
                backgroundColor: '#3b82f6',
                borderRadius: 6,
                barPercentage: 0.6,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                titleFont: { size: 14, weight: 'bold' },
                bodyFont: { size: 13 },
                cornerRadius: 8,
                displayColors: false
            }
        },
        scales: {
            y: {
                grid: {
                    color: 'rgba(226, 232, 240, 0.6)',
                    drawBorder: false,
                },
                ticks: {
                    font: { size: 11, family: 'Inter, sans-serif' },
                    color: '#64748b'
                }
            },
            x: {
                grid: {
                    display: false,
                    drawBorder: false,
                },
                ticks: {
                    font: { size: 11, family: 'Inter, sans-serif' },
                    color: '#64748b'
                }
            }
        }
    };

    const doughnutOptions = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
            legend: {
                position: 'right',
                labels: {
                    font: { size: 12, family: 'Inter, sans-serif' },
                    color: '#1e293b',
                    usePointStyle: true,
                    padding: 20
                }
            },
            tooltip: {
                backgroundColor: '#1e293b',
                padding: 12,
                cornerRadius: 8
            }
        }
    };

    return (
        <AppLayout title="Analytics">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-dark)', margin: 0 }}>Command Center</h2>
                    <p style={{ color: 'var(--text-light)', marginTop: '4px' }}>Real-time Emergency Analytics</p>
                </div>
                <Link href="/dashboard" className="btn btn-outline" style={{ padding: '8px 16px', fontSize: '0.9rem' }}>Back</Link>
            </div>

            {/* Top KPI Metrics Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="card" style={{ marginBottom: 0, padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #ef4444' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Emergencies</span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#ef4444' }}>35</span>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>↑ 12% from last week</span>
                </div>
                <div className="card" style={{ marginBottom: 0, padding: '1.2rem', display: 'flex', flexDirection: 'column', gap: '8px', borderLeft: '4px solid #3b82f6' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Avg Dispatch Time</span>
                    <span style={{ fontSize: '2rem', fontWeight: 800, color: '#3b82f6' }}>4.2<span style={{ fontSize: '1.2rem' }}>m</span></span>
                    <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>↓ 0.5m improvement</span>
                </div>
            </div>

            {/* Charts Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
                
                {/* Line Chart */}
                <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)' }}>SOS Activity Volume</h3>
                        <select className="form-control" style={{ width: 'auto', padding: '4px 8px', fontSize: '0.85rem' }} value={timeRange} onChange={(e) => setTimeRange(e.target.value)}>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                        </select>
                    </div>
                    <div style={{ height: '220px', width: '100%' }}>
                        <Line data={sosTriggerData} options={chartOptions} />
                    </div>
                </div>

                {/* Doughnut and Bar layout side-by-side or stacked depending on width */}
                <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', marginBottom: '1rem' }}>AI Triage Diagnosis Breakdown</h3>
                    <div style={{ height: '200px', width: '100%', display: 'flex', justifyContent: 'center' }}>
                        <Doughnut data={conditionData} options={doughnutOptions} />
                    </div>
                </div>

                <div className="card" style={{ padding: '1.5rem', marginBottom: 0 }}>
                    <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', marginBottom: '1rem' }}>Ambulance Response by Zone</h3>
                    <div style={{ height: '200px', width: '100%' }}>
                        <Bar data={responseTimeData} options={{...chartOptions, scales: {...chartOptions.scales, x: { grid: { display: false } }}}} />
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}
