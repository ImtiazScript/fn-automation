import CronsDataTable from '../../components/CommonComponents/CronDataTable';
import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useGetCronsDataMutation } from '../../slices/commonApiSlice';
import Loader from '../../components/Loader';

const CronsManagementScreen = () => {
  const [cronsData, setCronsData] = useState([]);
  const [cronsDataFromAPI, { isLoading }] = useGetCronsDataMutation();

  useEffect(() => {
    try {
      const fetchData = async () => {
        const responseFromApiCall = await cronsDataFromAPI();
        const cronsArray = responseFromApiCall.data.cronsData;
        setCronsData(cronsArray);
      };
      fetchData();
    } catch (err) {
      toast.error(err?.data?.errors[0]?.message || err);
      console.error('Error fetching crons:', err);
    }
  }, []);

  return (
    <div>
      <h1>Crons List</h1>
      {isLoading ? <Loader /> : <CronsDataTable crons={cronsData} />}
    </div>
  );
};

export default CronsManagementScreen;
