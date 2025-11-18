import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export default function TestFalAPI() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState([]);

  const addResult = (test, success, message, data = null) => {
    setResults((prev) => [
      ...prev,
      { test, success, message, data, timestamp: new Date() },
    ]);
  };

  const testGenerateImage = async () => {
    try {
      addResult("Image Generation", null, "Starting image generation test...");
      const { data } = await base44.functions.invoke("generateImage", {
        prompt: "A cute cat sitting on a window sill",
        model: "fal-ai/flux/schnell",
        image_size: "square_hd",
        num_images: 1,
      });

      if (data.job_id) {
        addResult(
          "Image Generation",
          true,
          `✅ Job created: ${data.job_id}`,
          data,
        );

        // Check status
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const { data: statusData } = await base44.functions.invoke(
          "checkJobStatus",
          {
            job_id: data.job_id,
            model: "fal-ai/flux/schnell",
          },
        );

        addResult(
          "Status Check",
          true,
          `Status: ${statusData.status}`,
          statusData,
        );
      } else {
        addResult("Image Generation", false, "❌ No job_id returned", data);
      }
    } catch (error) {
      addResult("Image Generation", false, `❌ Error: ${error.message}`, error);
    }
  };

  const testGenerateVideo = async () => {
    try {
      addResult("Video Generation", null, "Starting video generation test...");
      const { data } = await base44.functions.invoke("generateVideo", {
        prompt: "A serene lake with mountains in the background",
        model: "fal-ai/fast-animatediff/text-to-video",
        duration: 3,
        aspect_ratio: "16:9",
      });

      if (data.job_id) {
        addResult(
          "Video Generation",
          true,
          `✅ Job created: ${data.job_id}`,
          data,
        );

        // Check status
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const { data: statusData } = await base44.functions.invoke(
          "checkJobStatus",
          {
            job_id: data.job_id,
            model: "fal-ai/fast-animatediff/text-to-video",
          },
        );

        addResult(
          "Status Check",
          true,
          `Status: ${statusData.status}`,
          statusData,
        );
      } else {
        addResult("Video Generation", false, "❌ No job_id returned", data);
      }
    } catch (error) {
      addResult("Video Generation", false, `❌ Error: ${error.message}`, error);
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    await testGenerateImage();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await testGenerateVideo();

    setTesting(false);
  };

  return (
    <div
      style={{
        background: "#0A0A0F",
        minHeight: "100vh",
        color: "#fff",
        padding: "40px 20px",
      }}
    >
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">FAL API Test Dashboard</h1>
        <p className="text-gray-400 mb-8">
          Test if your FAL API integration is working correctly
        </p>

        <div className="grid gap-4 mb-8">
          <Card className="p-6 bg-white/5 border border-white/10">
            <h3 className="text-xl font-bold mb-4">Quick Tests</h3>
            <div className="flex gap-4">
              <Button
                onClick={testGenerateImage}
                disabled={testing}
                className="bg-[#32C8D1] hover:opacity-90"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Test Image Generation
              </Button>

              <Button
                onClick={testGenerateVideo}
                disabled={testing}
                className="bg-[#F18B6A] hover:opacity-90"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Test Video Generation
              </Button>

              <Button
                onClick={runAllTests}
                disabled={testing}
                className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:opacity-90"
              >
                {testing ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Run All Tests
              </Button>
            </div>
          </Card>
        </div>

        <Card className="p-6 bg-white/5 border border-white/10">
          <h3 className="text-xl font-bold mb-4">Test Results</h3>

          {results.length === 0 ? (
            <p className="text-gray-400">
              No tests run yet. Click a button above to start testing.
            </p>
          ) : (
            <div className="space-y-3">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border ${
                    result.success === true
                      ? "bg-green-500/10 border-green-500/30"
                      : result.success === false
                        ? "bg-red-500/10 border-red-500/30"
                        : "bg-blue-500/10 border-blue-500/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {result.success === true ? (
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                    ) : result.success === false ? (
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <Loader2 className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5 animate-spin" />
                    )}

                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">
                          {result.test}
                        </span>
                        <span className="text-xs text-gray-500">
                          {result.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">
                        {result.message}
                      </p>

                      {result.data && (
                        <details className="text-xs">
                          <summary className="cursor-pointer text-gray-400 hover:text-white">
                            View Response Data
                          </summary>
                          <pre className="mt-2 p-3 bg-black/30 rounded overflow-x-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 bg-white/5 border border-white/10 mt-8">
          <h3 className="text-xl font-bold mb-4">What to Check:</h3>
          <ul className="space-y-2 text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>
                <strong>job_id returned:</strong> API key is valid and request
                was accepted
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-400">✓</span>
              <span>
                <strong>Status is "processing":</strong> Job is in queue
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">✗</span>
              <span>
                <strong>401 Unauthorized:</strong> API key is invalid or missing
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-400">✗</span>
              <span>
                <strong>402 Payment Required:</strong> No credits in FAL account
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-yellow-400">!</span>
              <span>
                <strong>Status is "failed":</strong> Check error message in
                response
              </span>
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
