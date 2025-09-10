import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, appId } from '../firebaseConfig'; // Usando nossa configuração central
import { Line } from 'react-chartjs-2';
import { formatDateToBrazilian } from '../utils/dateUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

// Precisamos registrar os componentes do Chart.js que vamos usar
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const StatsDashboard = ({ courseId, courseName }) => {
    const [attendanceData, setAttendanceData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!courseId) return;

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
                    const date = formatDateToBrazilian(new Date(data.date.seconds * 1000), 'short');
                    labels.push(date);

                    const presentCount = Object.values(data.statuses).filter(status => status === 'presente').length;
                    dataPoints.push(presentCount);
                });

                setAttendanceData({
                    labels,
                    datasets: [
                        {
                            label: `Presença - ${courseName}`,
                            data: dataPoints,
                            borderColor: '#DC2626',
                            backgroundColor: 'rgba(220, 38, 38, 0.2)',
                            fill: true,
                            tension: 0.1
                        },
                    ],
                });

            } catch (error) {
                console.error("Erro ao buscar dados de presença:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAttendanceData();
    }, [courseId, courseName]);

    if (loading) {
        return <div className="bg-white p-6 rounded-xl shadow-md text-center">Carregando dados do gráfico...</div>;
    }

    if (!attendanceData || attendanceData.labels.length === 0) {
        return <div className="bg-white p-6 rounded-xl shadow-md text-center">Não há dados de presença para este curso ainda.</div>;
    }

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: `Evolução de Presença: ${courseName}`,
            },
        },
    };

    return (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md mb-8">
            <Line options={options} data={attendanceData} />
        </div>
    );
};

export default StatsDashboard;