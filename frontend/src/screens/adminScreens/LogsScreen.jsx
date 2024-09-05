import LogsDataTable from '../../components/AdminComponents/LogsDataTable';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useGetLogsMutation } from '../../slices/adminApiSlice';
import Loader from '../../components/Loader';

const LogsScreen = () => {
  const [logsData, setLogsData] = useState([]);
  const [logsDataFromAPI, { isLoading }] = useGetLogsMutation();

  useEffect(() => {
    try {
      const fetchData = async () => {
        const responseFromApiCall = await logsDataFromAPI();
        const logsArray = responseFromApiCall.data.logs;
        setLogsData(logsArray);
      };
      fetchData();
    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err);
      console.error('Error fetching logs:', err);
    }
  }, []);

  return (
    <div>
      <h1>Logs List</h1>
      {isLoading ? <Loader /> : <LogsDataTable logs={logsData} />}
    </div>
  );
};

export default LogsScreen;
