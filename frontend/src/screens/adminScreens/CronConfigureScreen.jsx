import CronConfigure from "../../components/AdminComponents/CronConfigure";
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";

import { useGetCronDataMutation } from "../../slices/adminApiSlice";

import Loader from "../../components/Loader";


const CronConfigureScreen = () => {
  const { cronId } = useParams();

  const [cronData, setCronData] = useState([]);

  const [cronDataFromAPI, { isLoading } ] = useGetCronDataMutation();

  useEffect(() => {
    
    try {

      const fetchData = async () => {

        const responseFromApiCall = await cronDataFromAPI(cronId);

        const cronArray = responseFromApiCall.data.cronData;
  
        setCronData(cronArray);

      };
  
      fetchData();

    } catch (err) {

      toast.error( err?.data?.errors[0]?.message || err );

      console.error("Error fetching crons:", err);

    }

  }, []);

  return (
    <div>
      <h1>Configure Cron</h1>
      { isLoading ? <Loader/> : <CronConfigure cron={cronData} /> }
    </div>
  );
};

export default CronConfigureScreen;
