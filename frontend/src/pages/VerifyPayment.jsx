import {
  useEffect,
  useState
} from "react";

import {
  useSearchParams,
  useNavigate
} from "react-router-dom";

import request from "../api/client.js";

const VerifyPayment = () => {

  const [searchParams] =
    useSearchParams();

  const navigate =
    useNavigate();

  const [status, setStatus] =
    useState("Verifying payment...");

  useEffect(() => {

    const verify = async () => {

      try {

        const reference =
          searchParams.get(
            "reference"
          );

        await request(
          `/payments/verify?reference=${reference}`
        );

        setStatus(
          "Subscription activated successfully"
        );

        setTimeout(() => {

          navigate(
            "/app/billing"
          );

        }, 2500);

      } catch (err) {

        setStatus(
          err.message
        );

      }
    };

    verify();

  }, []);

  return (

    <section className="min-h-screen flex items-center justify-center bg-gray-100">

      <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-md w-full">

        <div className="text-2xl font-bold mb-4">
          Payment Verification
        </div>

        <p className="text-gray-600">
          {status}
        </p>

      </div>

    </section>
  );
};

export default VerifyPayment;