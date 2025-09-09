    import React, { useState, useEffect } from 'react';
    import { collection, query, getDocs, orderBy } from 'firebase/firestore';
    import { db, appId } from '../firebaseConfig';
    import { Line } from 'react-chartjs-2';

    // O Chart.js já foi registrado na outra página, mas é bom manter aqui por organização
    import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
    ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

    const CourseAttendanceChart = ({ courseId, courseName }) => {
        const [chartData, setChartData] = useState(null);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
            if (!courseId) {
                setLoading(false);
                return;
            }

            const fetchAttendanceData = async () => {
                setLoading(true);
                try {
                    const attendanceRef = collection(db, `artifacts/${appId}/public/data/courses/${courseId}/attendance`);
                    const q = query(attendanceRef, orderBy("date", "asc"));
                    const querySnapshot = await getDocs(q);

                    const labels = [];
                    const dataPoints = [];

                    querySnapshot.forEach(doc => {
                        const data = doc.data();
                        const date = new Date(data.date.seconds * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
                        labels.push(date);
                        
                        const totalStudents = Object.keys(data.statuses).length;
                        const presentCount = Object.values(data.statuses).filter(status => status === 'presente' || status === 'justificado').length;
                        const percentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
                        dataPoints.push(percentage);
                    });

                    setChartData({
                        labels,
                        datasets: [{
                            label: `Frequência do Curso (%)`,
                            data: dataPoints,
                            borderColor: '#2563EB',
                            backgroundColor: 'rgba(37, 99, 235, 0.2)',
                            fill: true,
                        }],
                    });
                } catch (error) {
                    console.error("Erro ao buscar dados de presença do curso:", error);
                } finally {
                    setLoading(false);
                }
            };

            fetchAttendanceData();
        }, [courseId, courseName]);

        if (loading) return <div className="text-center p-4">Carregando gráfico...</div>;
        if (!chartData || chartData.labels.length === 0) return <div className="text-center p-4">Sem dados de presença para o curso selecionado.</div>;

        const options = {
            responsive: true,
            plugins: {
                legend: { position: 'top' },
                title: { display: true, text: `Frequência do Curso: ${courseName}` },
            },
            scales: { y: { beginAtZero: true, max: 100, ticks: { callback: (value) => value + '%' } } }
        };

        return <Line options={options} data={chartData} />;
    };

    export default CourseAttendanceChart;
    