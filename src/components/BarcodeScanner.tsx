import { useEffect, useRef, useState } from "react";
import Quagga from "@ericblade/quagga2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, X } from "lucide-react";

interface BarcodeScannerProps {
  onDetected: (code: string) => void;
  onClose: () => void;
}

const BarcodeScanner = ({ onDetected, onClose }: BarcodeScannerProps) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (scannerRef.current && !isScanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, []);

  const startScanner = () => {
    if (!scannerRef.current) return;

    Quagga.init(
      {
        inputStream: {
          type: "LiveStream",
          target: scannerRef.current,
          constraints: {
            facingMode: "environment",
            width: { min: 640 },
            height: { min: 480 },
          },
        },
        decoder: {
          readers: ["code_128_reader", "ean_reader", "ean_8_reader", "code_39_reader"],
        },
        locate: true,
      },
      (err) => {
        if (err) {
          console.error("Error starting scanner:", err);
          return;
        }
        setIsScanning(true);
        Quagga.start();
      }
    );

    Quagga.onDetected((data) => {
      if (data.codeResult.code) {
        onDetected(data.codeResult.code);
        stopScanner();
      }
    });
  };

  const stopScanner = () => {
    Quagga.stop();
    setIsScanning(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            <CardTitle>Scan Student ID</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        <CardDescription>Position the barcode within the frame</CardDescription>
      </CardHeader>
      <CardContent>
        <div
          ref={scannerRef}
          className="relative w-full aspect-video bg-black rounded-lg overflow-hidden"
        />
        {!isScanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Initializing camera...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BarcodeScanner;
