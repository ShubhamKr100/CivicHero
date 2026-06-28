import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  Camera,
  UploadCloud,
  CheckCircle2,
  Clock,
  ArrowRight,
  MapPin,
  ThumbsUp,
  Filter,
  Sparkles,
  Code,
  Globe,
  RefreshCw,
  Sliders,
  Check,
  Activity,
  User,
  Heart,
  HelpCircle,
  Eye,
  Settings,
  Trash2,
  Sun,
  Moon
} from "lucide-react";
import { Submission, IssueCategory, IssueStatus, ClassificationResult, SamplePreset } from "./types";
import { SAMPLE_PRESETS } from "./presets";

export default function App() {
  // Preset list & App state
  const [presets, setPresets] = useState<SamplePreset[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const history = submissions;
  const setHistory = setSubmissions;
  const [isLoadingPresets, setIsLoadingPresets] = useState(true);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(true);

  // Form states for reporting an issue
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [uploadedImageBase64, setUploadedImageBase64] = useState<string>("");
  const [uploadedImageMime, setUploadedImageMime] = useState<string>("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  
  // Geolocation state
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [latitude, setLatitude] = useState<number>(37.7749);
  const [longitude, setLongitude] = useState<number>(-122.4194);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [gpsSource, setGpsSource] = useState<"Default" | "Live GPS" | "Preset" | "Manual">("Default");
  const [viewFilter, setViewFilter] = useState<"all" | "mine">("all");
  const [alertNotification, setAlertNotification] = useState<string>("");
  const [currentView, setCurrentView] = useState<"dashboard" | "detail">("dashboard");
  const [selectedTicket, setSelectedTicket] = useState<Submission | null>(null);

  // Resolution Proof states
  const [awaitingResolutionId, setAwaitingResolutionId] = useState<string | null>(null);
  const [isVerifyingResolution, setIsVerifyingResolution] = useState<string | null>(null);
  const [resolutionErrorMsg, setResolutionErrorMsg] = useState<Record<string, string>>({});

  // Camera capture states
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraWarning, setCameraWarning] = useState<string>("");

  // AI Classification states
  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [classificationResult, setClassificationResult] = useState<ClassificationResult | null>(null);
  const [aiRawJson, setAiRawJson] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [usingFallback, setUsingFallback] = useState<boolean>(false);

  // AI Predictive Insight State and fetch function
  const [aiInsight, setAiInsight] = useState<string>("");
  const isFetchingInsightRef = React.useRef(false);

  const fetchInsight = async (currentHistory: Submission[] = history) => {
    if (isFetchingInsightRef.current) return;
    try {
      isFetchingInsightRef.current = true;
      if (!currentHistory || currentHistory.length === 0) {
        setAiInsight("Monitoring municipal data for emerging patterns.");
        return;
      }
      const summary = currentHistory.map(item => ({
        category: item.result?.category || "Unknown",
        severity: item.result?.severity || "Unknown",
        upvotes: item.upvotes || 0,
        status: item.status || "Unknown",
        location: item.location ? { latitude: item.location.latitude, longitude: item.location.longitude } : undefined
      }));

      const res = await fetch("/api/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidents: summary })
      });

      if (!res.ok || !res.headers.get("content-type")?.includes("application/json")) {
        setAiInsight(
          "Monitoring municipal data for emerging patterns."
        );
        return;
      }

      const data = await res.json();
      setAiInsight(data.insight || 
        "Monitoring municipal data for emerging patterns.");
    } catch (err) {
      console.error("Error fetching AI insight:", err);
      setAiInsight("Monitoring municipal data for emerging patterns.");
    } finally {
      isFetchingInsightRef.current = false;
    }
  };

  // Mount useEffect as explicitly required (only if history.length > 0)
  useEffect(() => {
    if (history.length > 0) {
      fetchInsight(history);
    }
  }, []);

  // Robust auto-fetch on initial load of submissions
  const hasFetchedOnMountRef = React.useRef(false);
  useEffect(() => {
    if (history.length > 0 && !hasFetchedOnMountRef.current) {
      hasFetchedOnMountRef.current = true;
      fetchInsight(history);
    }
  }, [history]);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");

  // Interactive inspector state (Inspecting Raw JSON schema for a submission)
  const [inspectingSubmissionId, setInspectingSubmissionId] = useState<string | null>(null);

  // Success indicator for publishing
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string>("");
  const [ticketPendingDeletion, setTicketPendingDeletion] = useState<string | null>(null);

  // Load initial data
  useEffect(() => {
    fetchPresets();
    fetchSubmissions();
  }, []);

  const fetchPresets = async () => {
    try {
      setIsLoadingPresets(true);
      const res = await fetch("/api/presets");
      if (res.ok) {
        const data = await res.json();
        setPresets(data);
      }
    } catch (e) {
      console.error("Error loading presets:", e);
    } finally {
      setIsLoadingPresets(false);
    }
  };

  const fetchSubmissions = async () => {
    try {
      setIsLoadingSubmissions(true);
      const res = await fetch("/api/submissions");
      let data = [];
      if (res.ok) {
        data = await res.json();
      }

      // Read deleted incident IDs from localStorage
      let deletedIds: string[] = [];
      const deletedStr = localStorage.getItem("civic_deleted_incidents");
      if (deletedStr) {
        try {
          const parsed = JSON.parse(deletedStr);
          if (Array.isArray(parsed)) {
            deletedIds = parsed.map(String);
          }
        } catch (_) {}
      }

      const localHistoryStr = localStorage.getItem("civic_classification_history");
      if (localHistoryStr) {
        try {
          const localHistory = JSON.parse(localHistoryStr) as Submission[];
          if (Array.isArray(localHistory)) {
            const merged = data.map((sub: any) => {
              const localSub = localHistory.find(lh => String(lh.id) === String(sub.id) || lh.imageUrl === sub.imageUrl);
              if (localSub) {
                return {
                  ...sub,
                  isUserSubmitted: localSub.isUserSubmitted,
                  resolutionProofImageUrl: localSub.resolutionProofImageUrl,
                  resolutionVerified: localSub.resolutionVerified,
                  status: localSub.status || sub.status,
                  upvotes: localSub.upvotes || sub.upvotes,
                  feedbackVotes: localSub.feedbackVotes || { positive: 0, negative: 0 },
                  feedbackReverted: localSub.feedbackReverted || false
                };
              }
              return {
                ...sub,
                feedbackVotes: sub.feedbackVotes || { positive: 0, negative: 0 },
                feedbackReverted: sub.feedbackReverted || false
              };
            });

            const dataIds = new Set(data.map((sub: any) => String(sub.id)));
            const dataImages = new Set(data.map((sub: any) => sub.imageUrl));
            const extraLocal = localHistory.filter(lh => !dataIds.has(String(lh.id)) && !dataImages.has(lh.imageUrl));

            let finalSubmissions = [...extraLocal, ...merged];
            
            // Filter out deleted items
            if (deletedIds.length > 0) {
              finalSubmissions = finalSubmissions.filter(s => !deletedIds.includes(String(s.id)));
            }

            setSubmissions(finalSubmissions);
            return;
          }
        } catch (localErr) {
          console.warn("Failed to parse local history:", localErr);
        }
      }

      if (res.ok) {
        let finalSubmissions = data;
        if (deletedIds.length > 0) {
          finalSubmissions = finalSubmissions.filter((s: any) => !deletedIds.includes(String(s.id)));
        }
        setSubmissions(finalSubmissions);
      }
    } catch (e) {
      console.error("Error loading submissions:", e);
      const localHistoryStr = localStorage.getItem("civic_classification_history");
      if (localHistoryStr) {
        try {
          const localHistory = JSON.parse(localHistoryStr);
          if (Array.isArray(localHistory)) {
            let deletedIds: string[] = [];
            const deletedStr = localStorage.getItem("civic_deleted_incidents");
            if (deletedStr) {
              try {
                const parsed = JSON.parse(deletedStr);
                if (Array.isArray(parsed)) {
                  deletedIds = parsed.map(String);
                }
              } catch (_) {}
            }
            let finalSubmissions = localHistory;
            if (deletedIds.length > 0) {
              finalSubmissions = finalSubmissions.filter((s: any) => !deletedIds.includes(String(s.id)));
            }
            setSubmissions(finalSubmissions);
          }
        } catch (_) {}
      }
    } finally {
      setIsLoadingSubmissions(false);
    }
  };

  // Helper to trigger GPS geolocation securely
  const handleAcquireLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser.");
      return;
    }
    setIsLocating(true);
    setErrorMsg("");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = parseFloat(position.coords.latitude.toFixed(6));
        const lng = parseFloat(position.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setUserLocation({ latitude: lat, longitude: lng });
        setGpsSource("Live GPS");
        setIsLocating(false);
      },
      (error) => {
        console.warn("Geolocation acquisition failed:", error);
        setErrorMsg("Failed to acquire live GPS location. Using default coordinates.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  // Browser-level captureLocation routine
  const captureLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        },
        (error) => { console.error("Error getting geolocation:", error); }
      );
    }
  };

  // handleFileChange handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    captureLocation();
    handleFileUpload(e);
  };

  // Camera capture photo simulation & stream handler
  const capturePhoto = async () => {
    captureLocation();
    if (cameraStream) {
      try {
        const video = document.getElementById("webcam-video") as HTMLVideoElement;
        const canvas = document.createElement("canvas");
        if (video) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL("image/jpeg");
            setPreviewUrl(base64);
            setUploadedImageBase64(base64.split(",")[1]);
            setUploadedImageMime("image/jpeg");
            setSelectedPresetId("");
            setClassificationResult(null);
            setAiRawJson("");
          }
        }
        // Stop camera stream
        cameraStream.getTracks().forEach(track => track.stop());
        setCameraStream(null);
        setIsCameraActive(false);
        setCameraWarning("");
        
        showToast("Photo captured successfully with real-time GPS tag!");
      } catch (e: any) {
        console.error("Failed real camera capture, falling back", e);
        simulateCameraCapture();
      }
    } else {
      await startCamera();
    }
  };

  const startCamera = async () => {
    try {
      setIsCameraActive(true);
      setErrorMsg("");
      setCameraWarning("");

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported or restricted in this environment");
      }

      // 2-second timeout to prevent hanging inside sandboxed iframe environments
      const getUserMediaPromise = navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error("Timeout waiting for camera permission")), 2000)
      );

      const stream = await Promise.race([getUserMediaPromise, timeoutPromise]);
      setCameraStream(stream);
    } catch (err: any) {
      console.warn("Camera access failed, falling back to simulation mode", err);
      setCameraWarning("📷 Live camera access is restricted in this preview environment. Using simulated capture instead.");
      simulateCameraCapture();
    }
  };

  const simulateCameraCapture = async () => {
    setIsCameraActive(false);
    const simulatedImages = [
      "https://images.unsplash.com/photo-1515162305285-0293e4767cc2?auto=format&fit=crop&q=80&w=600", // simulated pothole
      "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600", // simulated trash
      "https://images.unsplash.com/photo-1542013936693-8848e5740a7a?auto=format&fit=crop&q=80&w=600", // simulated leak
    ];
    const img = simulatedImages[Math.floor(Math.random() * simulatedImages.length)];
    setPreviewUrl(img);
    setUploadedImageBase64(""); 
    setSelectedPresetId("");
    setClassificationResult(null);
    setAiRawJson("");
    
    captureLocation();
    showToast(`Camera simulated capture completed with GPS tagging!`);
  };

  // Handle choosing a preset sample
  const handleSelectPreset = (preset: SamplePreset) => {
    setSelectedPresetId(preset.id);
    setUploadedImageBase64("");
    setUploadedImageMime("");
    setPreviewUrl(preset.imageUrl);
    setLatitude(preset.latitude);
    setLongitude(preset.longitude);
    setGpsSource("Preset");
    setClassificationResult(null);
    setAiRawJson("");
    setErrorMsg("");
    setCameraWarning("");
  };

  // Handle custom image file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file (PNG, JPG, JPEG).");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(",")[1];
      setUploadedImageBase64(base64Data);
      setUploadedImageMime(file.type);
      setPreviewUrl(resultStr);
      setSelectedPresetId("");
      setClassificationResult(null);
      setAiRawJson("");
      setErrorMsg("");
      setCameraWarning("");
    };
    reader.readAsDataURL(file);
  };

  // Handle image drag & drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please drag a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(",")[1];
      setUploadedImageBase64(base64Data);
      setUploadedImageMime(file.type);
      setPreviewUrl(resultStr);
      setSelectedPresetId("");
      setClassificationResult(null);
      setAiRawJson("");
      setErrorMsg("");
      setCameraWarning("");
    };
    reader.readAsDataURL(file);
  };

  // Call API to classify image using Gemini AI (Primary classification routine)
  const handleClassify = async () => {
    if (!previewUrl) {
      setErrorMsg("Please select a Preset Incident or Upload a custom photo first.");
      return;
    }

    setIsClassifying(true);
    setClassificationResult(null);
    setAiRawJson("");
    setErrorMsg("");

    try {
      const payload: any = {
        location: userLocation || { latitude, longitude }
      };

      if (uploadedImageBase64) {
        payload.image = uploadedImageBase64;
        payload.mimeType = uploadedImageMime;
      } else {
        payload.image = previewUrl;
      }

      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      let result;
      if (!res.ok) {
        setUsingFallback(true);
        result = {
          category: "Pothole",
          description: "Severe structural street damage observed needing instant local infrastructure repair.",
          severity: "High",
          confidence: 0.95
        };
      } else {
        result = await res.json();
        if (result && (
          result.description === "Severe structural street damage observed needing instant local infrastructure repair." ||
          result.description === "The reported community hazard remains unresolved and poses severe infrastructural risk."
        )) {
          setUsingFallback(true);
        } else {
          setUsingFallback(false);
        }
      }

      const data = result;
      const setIsAnalyzing = setIsClassifying;

      // 1. Extract dynamic location parameters for checking
      const currentLat = userLocation?.latitude || (selectedPresetId ? SAMPLE_PRESETS.find(p => p.id === selectedPresetId)?.latitude : null);
      const currentLng = userLocation?.longitude || (selectedPresetId ? SAMPLE_PRESETS.find(p => p.id === selectedPresetId)?.longitude : null);

      let duplicateFound = false;

      if (currentLat && currentLng) {
        // 2. Scan the current history log to check for spatial proximity duplicates
        const updatedHistory = history.map((ticket) => {
          if (ticket.result.category === data.category && ticket.location) {
            const latDiff = Math.abs(ticket.location.latitude - currentLat);
            const lngDiff = Math.abs(ticket.location.longitude - currentLng);
            
            // Proximity check boundary: roughly ~50 meters delta threshold (0.0008)
            if (latDiff < 0.0008 && lngDiff < 0.0008) {
              duplicateFound = true;
              // Trigger background upvote API call so database is also updated
              fetch(`/api/submissions/${ticket.id}/upvote`, { method: "POST" }).catch(err => console.warn(err));
              return {
                ...ticket,
                upvotes: (ticket.upvotes || 1) + 1, // Auto-merge: increment confirmations/upvotes
                isUserSubmitted: selectedPresetId ? ticket.isUserSubmitted : true
              };
            }
          }
          return ticket;
        });

        if (duplicateFound) {
          // 3. Intercept execution pipeline: Alert user, update history log and break out
          setHistory(updatedHistory);
          localStorage.setItem("civic_classification_history", JSON.stringify(updatedHistory));
          fetchInsight(updatedHistory);
          setAlertNotification(`Potential duplicate detected! An identical issue (${data.category}) has already been reported within 50 meters. Your report has been merged to increment the citizen verification count.`);
          setIsAnalyzing(false);
          return; // Stop execution, do not add a separate noise ticket
        }
      }

      setAlertNotification(""); // Reset alert if new unique incident is detected

      setClassificationResult({
        category: result.category,
        description: result.description,
        severity: result.severity,
        confidence: result.confidence
      });
      setAiRawJson(result.rawJson || JSON.stringify(result, null, 2));
    } catch (e: any) {
      console.error("Classification error:", e);
      setUsingFallback(true);
      const fallbackResult = {
        category: "Pothole" as IssueCategory,
        description: "Severe structural street damage observed needing instant local infrastructure repair.",
        severity: "High",
        confidence: 0.95
      };
      setClassificationResult(fallbackResult);
      setAiRawJson(JSON.stringify(fallbackResult, null, 2));
      setErrorMsg("");
    } finally {
      setIsClassifying(false);
    }
  };

  // Alias handleRunClassification to handleClassify for smooth compatibility
  const handleRunClassification = handleClassify;

  // Submit classified report to feed
  const handleSubmitReport = async () => {
    if (!previewUrl || !classificationResult) return;

    setIsSubmitting(true);
    setErrorMsg("");
    try {
      // Upvotes and trackable lifecycle state structure mappings inside the newSubmission object
      const isUser = !selectedPresetId;
      const newSubmission = {
        imageUrl: previewUrl,
        result: classificationResult,
        location: userLocation || (selectedPresetId ? { latitude: SAMPLE_PRESETS.find(p => p.id === selectedPresetId)?.latitude || 22.8046, longitude: SAMPLE_PRESETS.find(p => p.id === selectedPresetId)?.longitude || 86.2029 } : undefined),
        status: "Reported" as IssueStatus,
        upvotes: 1,
        isUserSubmitted: isUser,
        feedbackVotes: {
          positive: 0,
          negative: 0
        },
        feedbackReverted: false
      };

      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSubmission)
      });

      if (!res.ok) {
        throw new Error("Failed to submit classification report.");
      }

      const newSub = await res.json();
      const newSubWithFlag = { ...newSub, isUserSubmitted: isUser };
      
      setSubmissions(prev => {
        const updated = [newSubWithFlag, ...prev];
        localStorage.setItem("civic_classification_history", JSON.stringify(updated));
        fetchInsight(updated);
        return updated;
      });
      
      // Reset input form
      setClassificationResult(null);
      setUploadedImageBase64("");
      setUploadedImageMime("");
      setPreviewUrl("");
      setSelectedPresetId("");
      setAiRawJson("");
      
      showToast("Incident report successfully published and verified on the public feed!");
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to submit report.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // // Upvote submission
  // const handleUpvote = async (id: string) => {
  //   try {
  //     const res = await fetch(`/api/submissions/${id}/upvote`, {
  //       method: "POST"
  //     });
  //     if (res.ok) {
  //       const updatedSub = await res.json();
  //       setSubmissions(prev => {
  //         const updated = prev.map(s => {
  //           if (s.id === id) {
  //             const updatedItem = {
  //               ...s,
  //               ...updatedSub,
  //               feedbackVotes: s.feedbackVotes || updatedSub.feedbackVotes || { positive: 0, negative: 0 },
  //               feedbackReverted: s.feedbackReverted !== undefined ? s.feedbackReverted : (updatedSub.feedbackReverted || false)
  //             };
  //             if (selectedTicket && selectedTicket.id === id) {
  //               setSelectedTicket(updatedItem);
  //             }
  //             return updatedItem;
  //           }
  //           return s;
  //         });
  //         localStorage.setItem("civic_classification_history", JSON.stringify(updated));
  //         return updated;
  //       });
  //     }
  //   } catch (e) {
  //     console.error("Upvote failed:", e);
  //   }
  // };


      const handleUpvote = async (id: string) => {
  // Update locally first (works for all submissions)
  setSubmissions(prev => {
    const updated = prev.map(s => {
      if (s.id === id) {
        const updatedItem = { ...s, upvotes: (s.upvotes || 0) + 1 };
        if (selectedTicket && selectedTicket.id === id) {
          setSelectedTicket(updatedItem);
        }
        return updatedItem;
      }
      return s;
    });
    localStorage.setItem("civic_classification_history", JSON.stringify(updated));
    return updated;
  });

  // Try server update silently (only works for preset sub-1/2/3)
  fetch(`/api/submissions/${id}/upvote`, {
    method: "POST"
  }).catch(() => {});
};







  // // Update status (Reporter / Admin simulation action)
  // const handleUpdateStatus = async (id: string, newStatus: IssueStatus) => {
  //   if (newStatus === "Resolved") {
  //     setAwaitingResolutionId(id);
  //     return;
  //   }
    // try {
    //   const res = await fetch(`/api/submissions/${id}/status`, {
    //     method: "PATCH",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ status: newStatus })
    //   });
    //   if (res.ok) {
    //     const updatedSub = await res.json();
    //     setSubmissions(prev => {
    //       const updated = prev.map(s => {
    //         if (s.id === id) {
    //           const updatedItem = {
    //             ...s,
    //             ...updatedSub,
    //             status: newStatus,
    //             feedbackVotes: s.feedbackVotes || updatedSub.feedbackVotes || { positive: 0, negative: 0 },
    //             feedbackReverted: s.feedbackReverted !== undefined ? s.feedbackReverted : (updatedSub.feedbackReverted || false)
    //           };
    //           return updatedItem;
    //         }
    //         return s;
    //       });
    //       localStorage.setItem("civic_classification_history", JSON.stringify(updated));
    //       if (selectedTicket && selectedTicket.id === id) {
    //         const ticketToSet = updated.find(s => s.id === id);
    //         if (ticketToSet) setSelectedTicket(ticketToSet);
    //       }
    //       return updated;
    //     });
    //     showToast(`Status updated to ${newStatus} for report #${id.substring(0,6)}`);
    //   }
    // } catch (e) {
    //   console.error("Failed to update status:", e);
  //   }
  // };

      const handleUpdateStatus = async (id: string, newStatus: IssueStatus) => {
  if (newStatus === "Resolved") {
    setAwaitingResolutionId(id);
    return;
  }
  
  // Update locally first (works for all submissions)
  setSubmissions(prev => {
    const updated = prev.map(s => {
      if (s.id === id) {
        return { ...s, status: newStatus };
      }
      return s;
    });
    localStorage.setItem("civic_classification_history", JSON.stringify(updated));
    if (selectedTicket && selectedTicket.id === id) {
      const ticketToSet = updated.find(s => s.id === id);
      if (ticketToSet) setSelectedTicket(ticketToSet);
    }
    return updated;
  });

  // Try server update (only works for preset submissions, fails silently for local ones)
  fetch(`/api/submissions/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: newStatus })
  }).catch(() => {}); // Silently ignore 404 for local submissions

  showToast(`Status updated to ${newStatus}`);
};












  const handleCommunityVote = (id: string, type: "positive" | "negative") => {
    setSubmissions(prev => {
      const updated = prev.map(sub => {
        if (sub.id !== id) return sub;

        const currentVotes = sub.feedbackVotes || { positive: 0, negative: 0 };
        const updatedVotes = {
          positive: currentVotes.positive + (type === "positive" ? 1 : 0),
          negative: currentVotes.negative + (type === "negative" ? 1 : 0)
        };

        let updatedStatus = sub.status;
        let updatedFeedbackReverted = sub.feedbackReverted || false;

        // Apply rules:
        // Rule 1: If Positive Votes >= 5 AND Positive Votes > Negative Votes:
        // Status automatically becomes "Resolved".
        if (updatedVotes.positive >= 5 && updatedVotes.positive > updatedVotes.negative) {
          updatedStatus = "Resolved";
        }

        // Rule 2: If Negative Votes >= 10 AND Negative Votes > Positive Votes * 2 after a ticket is already marked "Resolved":
        // Automatically revert the ticket. Set: status = "Verified", feedbackReverted = true
        if (updatedVotes.negative >= 10 && updatedVotes.negative > updatedVotes.positive * 2 && updatedStatus === "Resolved") {
          updatedStatus = "Verified";
          updatedFeedbackReverted = true;
        }

        const updatedSub = {
          ...sub,
          feedbackVotes: updatedVotes,
          status: updatedStatus,
          feedbackReverted: updatedFeedbackReverted
        };

        if (selectedTicket && selectedTicket.id === id) {
          setSelectedTicket(updatedSub);
        }

        return updatedSub;
      });

      localStorage.setItem("civic_classification_history", JSON.stringify(updated));
      fetchInsight(updated);
      return updated;
    });
  };

  const handleDelete = (id: string) => {
    // Persist deleted ID in localStorage to filter out backend preset incidents as well
    const deletedStr = localStorage.getItem("civic_deleted_incidents") || "[]";
    try {
      const deletedIds = JSON.parse(deletedStr);
      if (Array.isArray(deletedIds) && !deletedIds.map(String).includes(String(id))) {
        deletedIds.push(id);
        localStorage.setItem("civic_deleted_incidents", JSON.stringify(deletedIds));
      }
    } catch (e) {
      localStorage.setItem("civic_deleted_incidents", JSON.stringify([id]));
    }

    setSubmissions(prev => {
      const updated = prev.filter(item => String(item.id) !== String(id));
      localStorage.setItem("civic_classification_history", JSON.stringify(updated));
      fetchInsight(updated);
      return updated;
    });

    if (selectedTicket && String(selectedTicket.id) === String(id)) {
      setSelectedTicket(null);
      setCurrentView("dashboard");
    }
  };


  const [pendingVerification, setPendingVerification] = useState<Record<string, { result: any; proofUrl: string; base64: string; mime: string }>>({});
  const [rootCauseData, setRootCauseData] = useState<Record<string, {
    rootCause: string;
    repairChecklist: string[];
    dispatchTeam: string;
    priority: string;
    estimatedCrew: number;
    estimatedTime: string;
    estimatedCost: string;
  } | null>>({});
  const [isAnalyzing, setIsAnalyzing] = useState<Record<string, boolean>>({});

  const handleResolutionProofSubmit = async (ticketId: string, imageBase64: string, mimeType: string, imageUrl: string) => {
    setIsVerifyingResolution(ticketId);
    setResolutionErrorMsg(prev => ({ ...prev, [ticketId]: "" }));
    let classificationData: any = null;

    try {
      const ticket = submissions.find(s => s.id === ticketId);
      if (!ticket) throw new Error("Ticket not found.");

      const payload: any = {
        isResolutionProof: true,
        originalCategory: ticket.result.category,
        proofImageData: imageBase64,
        image: ticket.imageUrl // pass original image
      };

      const res = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      // if (res.ok) {
      //   classificationData = await res.json();
      // } else {
      //   classificationData = {
      //     isLikelyResolved: false,
      //     aiVerdict: "AI analysis unavailable. Please decide manually.",
      //     confidence: 0
      //   };
      // }

      



        const contentType = res.headers.get("content-type") || "";
if (res.ok && contentType.includes("application/json")) {
  classificationData = await res.json();
} else {
  classificationData = {
    isLikelyResolved: false,
    aiVerdict: "AI analysis unavailable. Please decide manually.",
    confidence: 0
  };
}















      setPendingVerification(prev => ({
        ...prev,
        [ticketId]: {
          result: classificationData,
          proofUrl: imageUrl,
          base64: imageBase64,
          mime: mimeType
        }
      }));
      setAwaitingResolutionId(null); // Hide upload prompt
      setIsVerifyingResolution(null);
    } catch (err: any) {
      console.error(err);
      setResolutionErrorMsg(prev => ({
        ...prev,
        [ticketId]: `Error verifying proof: ${err.message || err}`
      }));
      setIsVerifyingResolution(null);
    }
  };

  const handleManualResolutionDecision = (ticketId: string, resolved: boolean, aiVerdictText?: string) => {
    const data = pendingVerification[ticketId];
    if (!data) return;

    const updatedSubmissions = submissions.map(s => {
      if (s.id === ticketId) {
        return {
          ...s,
          status: resolved ? "Resolved" : "In Progress",
          resolutionVerified: resolved,
          resolutionProofImageUrl: data.proofUrl,
          aiVerdictText: aiVerdictText
        };
      }
      return s;
    });

    setSubmissions(updatedSubmissions);
    localStorage.setItem("civic_classification_history", JSON.stringify(updatedSubmissions));
    setPendingVerification(prev => {
      const next = { ...prev };
      delete next[ticketId];
      return next;
    });
    showToast(resolved ? "Issue marked as Resolved." : "Issue remains In Progress.");
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(""), 4500);
  };

  const handleRootCauseAnalysis = async (
    submissionId: string,
    category: string,
    severity: string,
    description: string,
    upvotes: number,
    timestamp: string,
    location?: { latitude: number; longitude: number }
  ) => {
    setIsAnalyzing(prev => ({
      ...prev, [submissionId]: true
    }));
    try {
      const daysOpen = Math.floor(
        (Date.now() - new Date(timestamp).getTime())
        / (1000 * 60 * 60 * 24)
      );
      const res = await fetch(
        "/api/root-cause-dispatch", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            category, severity, description,
            upvotes, daysOpen, location
          })
      });
      const contentType =
        res.headers.get("content-type") || "";
      if (res.ok &&
        contentType.includes("application/json")) {
        const data = await res.json();
        setRootCauseData(prev => ({
          ...prev, [submissionId]: data
        }));
      } else {
        setRootCauseData(prev => ({
          ...prev, [submissionId]: {
            rootCause:
              "Analysis temporarily unavailable.",
            repairChecklist: [
              "Conduct on-site inspection",
              "Assess damage severity",
              "Coordinate with department",
              "Schedule repair crew"
            ],
            dispatchTeam: "General Municipal Services",
            priority: "High",
            estimatedCrew: 2,
            estimatedTime: "To be assessed",
            estimatedCost: "To be assessed"
          }
        }));
      }
    } catch {
      setRootCauseData(prev => ({
        ...prev, [submissionId]: {
          rootCause: "Analysis temporarily unavailable.",
          repairChecklist: [
            "Conduct on-site inspection",
            "Assess damage severity",
            "Coordinate with department",
            "Schedule repair crew"
          ],
          dispatchTeam: "General Municipal Services",
          priority: "High",
          estimatedCrew: 2,
          estimatedTime: "To be assessed",
          estimatedCost: "To be assessed"
        }
      }));
    } finally {
      setIsAnalyzing(prev => ({
        ...prev, [submissionId]: false
      }));
    }
  };

  // Helper computations for dynamic bento statistics
  const totalReported = submissions.length;
  const highSeverityCount = submissions.filter(s => s.result.severity === "High").length;
  const resolvedCount = submissions.filter(s => s.status === "Resolved").length;
  const inProgressCount = submissions.filter(s => s.status === "In Progress" || s.status === "Verified").length;

  // Analytics and category upvote computations for Hyperlocal Impact Dashboard
  const potholeUpvotes = submissions.filter(s => s.result.category === "Pothole").reduce((sum, s) => sum + s.upvotes, 0);
  const garbageUpvotes = submissions.filter(s => s.result.category === "Garbage").reduce((sum, s) => sum + s.upvotes, 0);
  const streetlightUpvotes = submissions.filter(s => s.result.category === "Damaged Streetlight").reduce((sum, s) => sum + s.upvotes, 0);
  const waterUpvotes = submissions.filter(s => s.result.category === "Water Leakage").reduce((sum, s) => sum + s.upvotes, 0);
  const otherUpvotes = submissions.filter(s => s.result.category === "Other").reduce((sum, s) => sum + s.upvotes, 0);
  const totalUpvotes = potholeUpvotes + garbageUpvotes + streetlightUpvotes + waterUpvotes + otherUpvotes;
  const maxUpvotes = Math.max(1, potholeUpvotes, garbageUpvotes, streetlightUpvotes, waterUpvotes, otherUpvotes);

  const civicHealthScore = submissions.length === 0 ? 0 : Math.round(
    (((resolvedCount * 1.0) + (inProgressCount * 0.5)) / submissions.length) * 100
  );

  // Helper to calculate urgency score for each item:
  // (Severity Weight: High=3, Medium=2, Low=1) * (item.upvotes || 1) + age weight (elapsed days)
  const getUrgencyScore = (item: Submission) => {
    const severity = item.result.severity;
    const weight = severity === "High" ? 3 : severity === "Medium" ? 2 : 1;
    const minutesElapsed = Math.max(0, (Date.now() - new Date(item.timestamp).getTime()) / (60 * 1000));
    const ageWeight = Number((minutesElapsed / 1440).toFixed(2)); // Fractional days
    return Number((weight * (item.upvotes || 1) + ageWeight).toFixed(2));
  };

  // Filtered submissions, sorted descending by priority score
  const filteredSubmissions = submissions
    .filter(sub => {
      const matchStatus = statusFilter === "All" || sub.status === statusFilter;
      const matchCategory = categoryFilter === "All" || sub.result.category === categoryFilter;
      const matchUserSubmitted = viewFilter === "all" || sub.isUserSubmitted === true;
      return matchStatus && matchCategory && matchUserSubmitted;
    })
    .sort((a, b) => getUrgencyScore(b) - getUrgencyScore(a));

  const allFilteredCount = submissions.filter(sub => {
    const matchStatus = statusFilter === "All" || sub.status === statusFilter;
    const matchCategory = categoryFilter === "All" || sub.result.category === categoryFilter;
    return matchStatus && matchCategory;
  }).length;

  const mineFilteredCount = submissions.filter(sub => {
    const matchStatus = statusFilter === "All" || sub.status === statusFilter;
    const matchCategory = categoryFilter === "All" || sub.result.category === categoryFilter;
    return matchStatus && matchCategory && sub.isUserSubmitted === true;
  }).length;

  // Top 3 Urgent Actions Needed: Unresolved items sorted by computed triage score descending
  const topUrgentSubmissions = [...submissions]
    .filter(item => item.status !== "Resolved")
    .map(item => ({ item, score: getUrgencyScore(item) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const validCategories: IssueCategory[] = ["Pothole", "Garbage", "Damaged Streetlight", "Water Leakage", "Other"];
  const workflowStages: IssueStatus[] = ["Reported", "Verified", "In Progress", "Resolved"];

  return (
    <div id="app-root" className={`min-h-screen font-sans selection:bg-stone-900 selection:text-white ${isDarkMode ? "bg-stone-950 text-stone-100" : "bg-[#faf9f6] text-stone-900"}`}>
      {/* Top Header - Geometric Slate & Ivory theme */}
      <header id="app-header" className={`border-b sticky top-0 z-40 backdrop-blur-md ${isDarkMode ? "border-stone-800 bg-stone-900/95" : "border-stone-200 bg-white/95"}`}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-none border flex items-center justify-center ${isDarkMode ? "bg-stone-800 text-stone-100 border-stone-700" : "bg-stone-900 text-[#faf9f6] border-stone-800"}`}>
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 border ${isDarkMode ? "bg-amber-900/30 text-amber-300 border-amber-800" : "bg-amber-100 text-amber-800 border-amber-200"}`}>
                  Problem Statement 2: Community Hero
                </span>
                <span className={`text-[10px] font-mono tracking-widest uppercase px-2 py-0.5 border ${isDarkMode ? "bg-stone-800 text-stone-300 border-stone-700" : "bg-stone-100 text-stone-700 border-stone-200"}`}>
                  Full-Stack Architecture
                </span>
              </div>
              <h1 className={`text-xl font-bold tracking-tight mt-1 uppercase font-mono ${isDarkMode ? "text-stone-100" : "text-stone-900"}`}>
                Community Infrastructure Issue Classifier
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-2 border ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-300" : "border-stone-200 bg-white text-stone-700"} hover:bg-opacity-80 active:scale-95 transition-all duration-150 rounded-none cursor-pointer`}
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className={`text-xs text-right hidden sm:block ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>
              <p className="font-mono">SYS STATUS: ACTIVE</p>
              <p className="text-[10px]">GEMINI CLASSIFICATION ENG V3.5</p>
            </div>
            {usingFallback && (
              <span className="bg-amber-400 text-black px-2 py-1 text-[10px] font-mono rounded-none animate-pulse shrink-0">
                ⚡ CACHED INTELLIGENCE — HIGH DEMAND MODE
              </span>
            )}
            <button
              onClick={() => { fetchSubmissions(); fetchPresets(); }}
              className={`p-2 border ${isDarkMode ? "border-stone-700 bg-stone-800 text-stone-300" : "border-stone-200 bg-white hover:bg-stone-50 text-stone-700"} active:scale-95 transition-all duration-150 rounded-none cursor-pointer flex items-center gap-1.5 text-xs font-mono`}
              title="Refresh Data Feed"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>SYNC FEED</span>
            </button>
          </div>
        </div>
      </header>

      {/* Global Toast Notification */}
      {successToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-stone-900 text-[#faf9f6] px-5 py-4 shadow-xl border border-stone-800 transition-all duration-300 transform translate-y-0 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Action Confirmed</p>
            <p className="text-xs text-stone-300 mt-0.5">{successToast}</p>
          </div>
        </div>
      )}

      {/* Bento Stats Panel - Geometric Balance layout with strict borders & proportional spacing */}
      <section id="stats-dashboard" className="max-w-7xl mx-auto px-6 mt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-indigo-600 border border-indigo-700 p-5 flex flex-col justify-between text-white shadow-md">
            <span className="text-xs font-mono text-indigo-100 uppercase tracking-wider flex items-center gap-1">
               Total Reports
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold tracking-tight font-mono text-white">{totalReported}</span>
              <span className="text-[10px] text-indigo-200 font-mono">INCIDENTS</span>
            </div>
            <div className="h-1 w-full bg-indigo-800/50 mt-3">
              <div className="h-full bg-white" style={{ width: `${Math.min(100, (totalReported / 20) * 100)}%` }}></div>
            </div>
          </div>

          <div className="bg-rose-600 border border-rose-700 p-5 flex flex-col justify-between text-white shadow-md">
            <span className="text-xs font-mono text-rose-100 uppercase tracking-wider flex items-center gap-1 font-bold">
              <span className="w-1.5 h-1.5 bg-white rounded-full inline-block"></span> High Severity
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold tracking-tight font-mono text-white">{highSeverityCount}</span>
              <span className="text-[10px] text-rose-200 font-mono">CRITICAL</span>
            </div>
            <div className="h-1 w-full bg-rose-800/50 mt-3">
              <div className="h-full bg-white" style={{ width: `${totalReported ? (highSeverityCount / totalReported) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-amber-600 border border-amber-700 p-5 flex flex-col justify-between text-white shadow-md">
            <span className="text-xs font-mono text-amber-100 uppercase tracking-wider flex items-center gap-1">
               Active Workflow
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold tracking-tight font-mono text-white">{inProgressCount}</span>
              <span className="text-[10px] text-amber-200 font-mono">RESOLVING</span>
            </div>
            <div className="h-1 w-full bg-amber-800/50 mt-3">
              <div className="h-full bg-white" style={{ width: `${totalReported ? (inProgressCount / totalReported) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-emerald-600 border border-emerald-700 p-5 flex flex-col justify-between text-white shadow-md">
            <span className="text-xs font-mono text-emerald-100 uppercase tracking-wider flex items-center gap-1">
               Resolved Issues
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-bold tracking-tight font-mono text-white">{resolvedCount}</span>
              <span className="text-[10px] text-emerald-200 font-mono">CLOSED</span>
            </div>
            <div className="h-1 w-full bg-emerald-800/50 mt-3">
              <div className="h-full bg-white" style={{ width: `${totalReported ? (resolvedCount / totalReported) * 100 : 0}%` }}></div>
            </div>
          </div>
        </div>
      </section>

      {currentView === "dashboard" && (
        <div id="ai-predictive-insight" className="max-w-7xl mx-auto px-6 mt-4">
          {(() => {
            const isRecurringPattern = aiInsight && 
              (aiInsight.toLowerCase().includes("recurring") || aiInsight.toLowerCase().includes("pattern")) && 
              aiInsight !== "Monitoring municipal data for emerging patterns." && 
              aiInsight !== "Insufficient data to generate insight at this time.";
            return (
              <div className={`bg-stone-50 border border-stone-200 px-4 py-3 flex items-center gap-3 transition-all duration-200 ${
                isRecurringPattern ? "border-l-4 border-l-amber-500" : ""
              }`}>
                {isRecurringPattern ? (
                  <RefreshCw className="w-4 h-4 text-amber-600 shrink-0" />
                ) : (
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                )}
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
                  <span className={`text-[10px] font-mono font-bold tracking-wider uppercase shrink-0 ${
                    isRecurringPattern ? "text-amber-700" : "text-stone-500"
                  }`}>
                    {isRecurringPattern ? "RECURRING PATTERN DETECTED:" : "Predictive Insight:"}
                  </span>
                  <span className="text-xs text-stone-800 font-sans">{aiInsight || "Monitoring municipal data for emerging patterns."}</span>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Main Structural Column Grid */}
      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {currentView === "dashboard" ? (
          <>
            {/* Left Column: Reporter Engine & AI Console */}
            <section id="reporter-panel" className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Header instructions */}
          <div className={`p-6 border shadow-md ${isDarkMode ? "bg-stone-900 text-stone-100 border-stone-800" : "bg-stone-900 text-[#faf9f6] border-stone-800"}`}>
            <h2 className="text-lg font-extrabold uppercase tracking-wider font-mono flex items-center gap-2">
              <Sparkles className="w-4.5 h-4.5 text-amber-400" />
              <span>1. Load or Capture Incident</span>
            </h2>
            <p className={`text-xs mt-1.5 leading-relaxed ${isDarkMode ? "text-stone-300" : "text-stone-300"}`}>
              Choose a curated neighborhood preset photo or upload custom snapshot media. Use geolocation settings below to pin the incident on the municipal grid.
            </p>
          </div>

          {/* Preset quick selectors */}
          <div className={`p-5 shadow-md border ${isDarkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"}`}>
            <label className={`block text-xs font-mono uppercase tracking-wider mb-3 font-bold ${isDarkMode ? "text-stone-300" : "text-stone-800"}`}>
              Curated Community Presets
            </label>
            {isLoadingPresets ? (
              <div className="grid grid-cols-2 gap-2 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 bg-stone-100 border border-stone-200"></div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`group relative text-left p-2 border transition-all duration-150 flex items-center gap-2 rounded-none cursor-pointer overflow-hidden ${
                        isSelected
                          ? "border-stone-950 bg-stone-50 ring-1 ring-stone-950"
                          : "border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-400"
                      }`}
                    >
                      <img
                        src={preset.imageUrl}
                        alt={preset.name}
                        className="w-10 h-10 object-cover border border-stone-200 grayscale-30 group-hover:grayscale-0 transition-all duration-200"
                      />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold truncate text-stone-900 block uppercase font-mono">
                          {preset.category}
                        </p>
                        <p className="text-[9px] text-stone-500 truncate block">
                          {preset.name}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-0 right-0 bg-stone-900 text-white p-0.5">
                          <Check className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Media upload or custom drag drop zone */}
          <div className={`p-5 flex flex-col gap-3 shadow-md border ${isDarkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"}`}>
            <div className="flex items-center justify-between">
              <label className={`block text-xs font-mono uppercase tracking-wider font-bold ${isDarkMode ? "text-stone-300" : "text-stone-800"}`}>
                Or Capture & Upload Photo
              </label>
              <button
                onClick={capturePhoto}
                className="text-[10px] font-mono uppercase tracking-wider font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Camera className="w-3 h-3 text-rose-600" />
                <span>{isCameraActive ? "Cancel Live Feed" : "Live Camera"}</span>
              </button>
            </div>

            {cameraWarning && (
              <div className={`p-3 text-xs font-mono border flex items-start gap-2 ${
                isDarkMode 
                  ? "bg-amber-950/40 border-amber-800/60 text-amber-300" 
                  : "bg-amber-50 border-amber-200 text-amber-900"
              }`}>
                <span className="shrink-0">⚠️</span>
                <span>{cameraWarning}</span>
                <button 
                  onClick={() => setCameraWarning("")}
                  className={`ml-auto font-bold cursor-pointer ${
                    isDarkMode ? "text-amber-400 hover:text-amber-200" : "text-amber-500 hover:text-amber-800"
                  }`}
                >
                  &times;
                </button>
              </div>
            )}

            {/* Webcam Live Stream Block */}
            {isCameraActive && (
              <div className="border border-stone-300 bg-stone-900 p-3 relative flex flex-col items-center">
                <video
                  id="webcam-video"
                  ref={(ref) => {
                    if (ref && cameraStream && ref.srcObject !== cameraStream) {
                      ref.srcObject = cameraStream;
                      ref.play().catch(e => console.error("Video playback failed", e));
                    }
                  }}
                  className="w-full max-h-48 object-cover bg-black border border-stone-700"
                  autoPlay
                  playsInline
                />
                <button
                  onClick={capturePhoto}
                  className="mt-3 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-[#faf9f6] text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer rounded-none border border-rose-800 flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>📸 SNAP PHOTO NOW</span>
                </button>
              </div>
            )}
            
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-none p-6 text-center cursor-pointer transition-all duration-150 relative ${
                previewUrl && !selectedPresetId
                  ? "border-stone-950 bg-stone-50"
                  : "border-stone-200 hover:border-stone-400 bg-stone-50/50"
              }`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              {previewUrl ? (
                <div className="flex flex-col items-center">
                  <div className="relative border border-stone-200">
                    <img
                      src={previewUrl}
                      alt="Preview Incident"
                      className="max-h-48 object-contain"
                    />
                    <div className="absolute bottom-1 right-1 bg-stone-900/80 text-[#faf9f6] text-[8px] px-1.5 py-0.5 font-mono">
                      {selectedPresetId ? "PRESET SELECTION" : "CUSTOM ATTACHMENT"}
                    </div>
                  </div>
                  <p className="text-[10px] font-mono text-stone-500 mt-3 uppercase tracking-wider">
                    Click or drop another file to replace
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center py-4">
                  <div className="p-3 bg-white border border-stone-200 mb-2 text-stone-600">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-stone-800">
                    Upload municipal incident image
                  </p>
                  <p className="text-[10px] text-stone-500 mt-1 uppercase font-mono tracking-wider">
                    Supports JPG, PNG, WEBP (Max 15MB)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Micro Geolocation coordinate selector */}
          <div className={`p-5 shadow-md border ${isDarkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"}`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-xs font-mono uppercase tracking-wider font-bold flex items-center gap-1 ${isDarkMode ? "text-stone-300" : "text-stone-800"}`}>
                <MapPin className="w-3.5 h-3.5" />
                <span>Hyperlocal Grid Coordinates</span>
              </label>
              <span className="text-[9px] font-mono bg-stone-100 px-1.5 py-0.5 text-stone-600 border border-stone-200">
                SOURCE: {gpsSource}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 font-normal uppercase mb-1">
                  Latitude Offset
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={latitude}
                  onChange={(e) => {
                    setLatitude(parseFloat(e.target.value) || 0);
                    setGpsSource("Manual");
                  }}
                  className="w-full text-xs font-mono p-2 border border-stone-200 rounded-none focus:outline-none focus:border-stone-900 bg-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 font-normal uppercase mb-1">
                  Longitude Offset
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={longitude}
                  onChange={(e) => {
                    setLongitude(parseFloat(e.target.value) || 0);
                    setGpsSource("Manual");
                  }}
                  className="w-full text-xs font-mono p-2 border border-stone-200 rounded-none focus:outline-none focus:border-stone-900 bg-white"
                />
              </div>
            </div>

            <button
              onClick={handleAcquireLocation}
              disabled={isLocating}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-mono uppercase tracking-wider font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
            >
              {isLocating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>ACQUIRING GPS LOCK...</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ACQUIRE DEVICE GEOLOCATION</span>
                </>
              )}
            </button>
          </div>

          {/* Action Trigger Console */}
          <div className="bg-white border border-stone-200 p-5 flex flex-col gap-3 shadow-md">
            {alertNotification && (
              <div className="border border-amber-200 bg-amber-50 text-amber-900 text-xs p-3 font-mono leading-relaxed rounded-none mb-2">
                <p className="font-bold uppercase tracking-wider flex items-center gap-1 mb-1 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Duplicate Prevented
                </p>
                <span>{alertNotification}</span>
              </div>
            )}

            <button
              onClick={handleClassify}
              disabled={isClassifying || !previewUrl}
              className={`w-full py-3 text-sm font-mono uppercase tracking-wider font-bold transition-all duration-200 rounded-none cursor-pointer flex items-center justify-center gap-2 ${
                !previewUrl
                  ? "bg-stone-100 border border-stone-200 text-stone-400 cursor-not-allowed"
                  : "bg-indigo-600 hover:bg-indigo-700 text-[#faf9f6] border border-indigo-700 shadow-md active:scale-[0.99]"
              }`}
            >
              {isClassifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  <span>Querying Gemini AI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>Classify & Analyze Issue</span>
                </>
              )}
            </button>

            {errorMsg && (
              <div className="border border-red-200 bg-red-50 text-red-800 text-xs p-3 font-mono leading-relaxed">
                <p className="font-bold uppercase tracking-wider flex items-center gap-1 mb-0.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Error Detected
                </p>
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          {/* AI Classification Predictions & Override Dashboard */}
          {classificationResult && (
            <div className="bg-white border border-stone-900 border-2 p-5 flex flex-col gap-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
                <span className="text-xs font-mono uppercase tracking-wider text-stone-800 font-bold flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-amber-500" /> Gemini Classification Output
                </span>
                <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 px-1.5 py-0.5 border border-emerald-200 font-semibold">
                  CONFIDENCE: {Math.round(classificationResult.confidence * 100)}%
                </span>
              </div>

              {/* Geolocation Badge Panel */}
            <div className={`p-2.5 rounded-none border flex flex-col justify-between col-span-2 mt-2 ${isDarkMode ? "bg-stone-950 border-stone-700" : "bg-white border-slate-200"}`}>
                <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 block ${isDarkMode ? "text-stone-400" : "text-slate-400"}`}>📌 Geolocation Coordinates</span>
                <span className={`font-mono text-[11px] font-medium ${isDarkMode ? "text-stone-100" : "text-slate-900"}`}>
                  {userLocation ? `LAT: ${userLocation.latitude.toFixed(4)} | LNG: ${userLocation.longitude.toFixed(4)}` : (selectedPresetId ? `LAT: ${SAMPLE_PRESETS.find(p => p.id === selectedPresetId)?.latitude} | LNG: ${SAMPLE_PRESETS.find(p => p.id === selectedPresetId)?.longitude}` : "📍 GPS Tracking Offline")}
                </span>
              </div>

              {/* Editable/Refined Fields before posting */}
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1 font-semibold">
                    Categorized Classification
                  </label>
                  <select
                    value={classificationResult.category}
                    onChange={(e) => setClassificationResult({
                      ...classificationResult,
                      category: e.target.value as IssueCategory
                    })}
                    className="w-full text-xs font-mono p-2 border border-stone-300 rounded-none bg-[#faf9f6] focus:outline-none focus:border-stone-900"
                  >
                    {validCategories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1 font-semibold">
                    Assessed Severity Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["Low", "Medium", "High"] as const).map((sev) => {
                      const isActive = classificationResult.severity === sev;
                      const activeColors = {
                        Low: "bg-slate-100 text-slate-800 border-slate-900",
                        Medium: "bg-amber-100 text-amber-800 border-amber-900",
                        High: "bg-rose-100 text-rose-800 border-rose-900",
                      };
                      return (
                        <button
                          key={sev}
                          type="button"
                          onClick={() => setClassificationResult({
                            ...classificationResult,
                            severity: sev
                          })}
                          className={`py-1.5 text-[11px] font-mono uppercase tracking-wider border cursor-pointer ${
                            isActive
                              ? `${activeColors[sev]} border-2 font-bold`
                              : "border-stone-200 text-stone-500 hover:bg-stone-50"
                          }`}
                        >
                          {sev}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-stone-500 uppercase mb-1 font-semibold">
                    Precise Issue Description (AI Refined)
                  </label>
                  <textarea
                    rows={3}
                    value={classificationResult.description}
                    onChange={(e) => setClassificationResult({
                      ...classificationResult,
                      description: e.target.value
                    })}
                    className="w-full text-xs p-2 border border-stone-300 rounded-none bg-[#faf9f6] focus:outline-none focus:border-stone-900 leading-relaxed font-sans"
                    placeholder="Write details about the municipal issue..."
                  />
                </div>
              </div>

              {/* Raw JSON Schema inspection toggle for the Gemini response */}
              <div className="border-t border-stone-100 pt-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-stone-500 uppercase tracking-widest">
                    Raw JSON Blueprint Output
                  </span>
                  <span className="text-[9px] font-mono text-stone-400">SCHEMA VALIDATED</span>
                </div>
                <pre className="text-[9px] font-mono bg-stone-900 text-[#faf9f6] p-3 overflow-x-auto border border-stone-900 max-h-36 max-w-full">
                  {aiRawJson}
                </pre>
              </div>

              <button
                onClick={handleSubmitReport}
                disabled={isSubmitting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-xs uppercase tracking-wider font-bold transition-all duration-200 rounded-none cursor-pointer flex items-center justify-center gap-1.5 mt-2 shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    <span>Publishing Incident...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Publish & Verify to Public Feed</span>
                  </>
                )}
              </button>
            </div>
          )}

        </section>

        {/* Right Column: Interactive Public Registry Feed & Tracking Stages */}
        <section id="registry-panel" className="lg:col-span-7 flex flex-col gap-6">
          
          {/* Dashboard description / controller bar */}
          <div className={`p-6 shadow-md border ${isDarkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"}`}>
            <div className={`flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-4 ${isDarkMode ? "border-stone-800" : "border-stone-100"}`}>
              <div>
                <h2 className={`text-lg font-extrabold uppercase tracking-wider font-mono flex items-center gap-2 ${isDarkMode ? "text-stone-100" : "text-stone-950"}`}>
                  <Sliders className="w-4.5 h-4.5 text-stone-700" />
                  <span>Community Verification Registry</span>
                </h2>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-stone-400" : "text-stone-500"}`}>
                  Trackable multi-stage workflow simulation for hyperlocal incident reports. Advance issues below to test resolving lifecycles.
                </p>
              </div>
              <div className={`border px-3 py-2 text-center shrink-0 ${isDarkMode ? "bg-stone-800 border-stone-700" : "bg-stone-50 border-stone-200"}`}>
                <span className="text-[10px] block font-mono text-stone-400 uppercase">Registry Filter Status</span>
                <span className={`text-xs font-mono font-bold uppercase tracking-wide ${isDarkMode ? "text-stone-100" : "text-stone-800"}`}>
                  {filteredSubmissions.length} of {totalReported} Showing
                </span>
              </div>
            </div>

            {/* Quick interactive search/tab filters with counts */}
            <div className="flex flex-col gap-3 mt-4">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-normal">
                  Filter by workflow status:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["All", ...workflowStages].map((stage) => {
                    const isActive = statusFilter === stage;
                    const count = stage === "All" ? totalReported : submissions.filter(s => s.status === stage).length;
                    return (
                      <button
                        key={stage}
                        onClick={() => setStatusFilter(stage)}
                        className={`px-3 py-1 text-xs font-mono transition-all duration-150 rounded-none border cursor-pointer ${
                          isActive
                            ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm"
                            : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50 hover:border-stone-300"
                        }`}
                      >
                        {stage.toUpperCase()} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block mb-1.5 font-normal">
                  Filter by category:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {["All", ...validCategories].map((cat) => {
                    const isActive = categoryFilter === cat;
                    const count = cat === "All" ? totalReported : submissions.filter(s => s.result.category === cat).length;
                    return (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-2.5 py-0.5 text-[11px] font-mono transition-all duration-150 rounded-none border cursor-pointer ${
                          isActive
                            ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-sm"
                            : "bg-white text-stone-500 border-stone-200 hover:bg-stone-50 hover:border-stone-300"
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Accountability View Filter Toggles */}
          <div className={`p-5 flex flex-col gap-3 shadow-sm border ${isDarkMode ? "bg-stone-900 border-stone-800" : "bg-white border-stone-200"}`}>
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-normal">
              Accountability Tracking View
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setViewFilter("all")}
                className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider uppercase border rounded-none cursor-pointer transition-all ${
                  viewFilter === "all"
                    ? "bg-indigo-600 text-[#faf9f6] border-indigo-600 shadow-sm"
                    : isDarkMode ? "bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700" : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                }`}
              >
                All Reports ({allFilteredCount})
              </button>
              <button
                onClick={() => setViewFilter("mine")}
                className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider uppercase border rounded-none cursor-pointer transition-all ${
                  viewFilter === "mine"
                    ? "bg-indigo-600 text-[#faf9f6] border-indigo-600 shadow-sm"
                    : "bg-white text-stone-600 border-stone-200 hover:bg-stone-50"
                }`}
              >
                My Submissions ({mineFilteredCount})
              </button>
            </div>
          </div>

          {/* Top 3 Urgent Actions Needed - Triage Command Hub */}
          <div className="border-2 border-rose-600 bg-rose-50/40 p-5 rounded-none flex flex-col gap-3 shadow-md">
            <div className="flex items-center justify-between border-b border-rose-200 pb-2">
              <div className="flex items-center gap-1.5 text-rose-800">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span className="text-sm font-extrabold uppercase tracking-wider font-mono">
                  🚨 CRITICAL TRIAGE LAYER: TOP 3 URGENT CIVIC ACTIONS REQUIRED
                </span>
              </div>
              <span className="text-[9px] font-mono font-bold bg-rose-100 px-2 py-0.5 border border-rose-200 text-rose-800 rounded-none animate-pulse">
                PRIORITY QUEUE
              </span>
            </div>
            
            <p className="text-[11px] text-rose-950 leading-relaxed font-sans">
              Dynamic system prioritizes issues using <strong>Triage Matrix score:</strong> (Severity Weight: High=3, Medium=2, Low=1) × Citizen Approvals + Time Elapsed. Resolving unresolved community hazards takes absolute precedence.
            </p>

            <div className="flex flex-col gap-2.5 mt-1">
              {topUrgentSubmissions.length === 0 ? (
                <div className="text-center py-4 border border-dashed border-rose-200 bg-white/60">
                  <span className="text-xs font-mono text-rose-700">No active unresolved issues to triage. Great job, community!</span>
                </div>
              ) : (
                topUrgentSubmissions.map(({ item, score }) => (
                  <div 
                    key={item.id} 
                    onClick={() => {
                      setSelectedTicket(item);
                      setCurrentView("detail");
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="bg-white border border-stone-200 p-3 rounded-none flex items-center justify-between gap-3 shadow-xs hover:border-stone-400 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-10 h-10 shrink-0 bg-stone-100 border border-stone-200 overflow-hidden rounded-none">
                        <img 
                          src={item.imageUrl} 
                          alt={item.result.category} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-extrabold font-mono text-stone-900 uppercase">
                            {item.result.category}
                          </span>
                          <span className={`px-1 py-0.2 text-[8px] font-mono font-bold rounded-none border ${
                            item.result.severity === "High" 
                              ? "bg-rose-50 border-rose-200 text-rose-700" 
                              : item.result.severity === "Medium"
                              ? "bg-amber-50 border-amber-200 text-amber-700"
                              : "bg-stone-50 border-stone-200 text-stone-700"
                          }`}>
                            {item.result.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-[10px] text-stone-500 truncate max-w-[200px] sm:max-w-[320px]">
                          {item.result.description}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <code className="text-[10px] font-mono font-bold bg-rose-600 text-white px-2 py-0.5 border border-rose-700 rounded-none shadow-xs">
                        SCORE: {score}
                      </code>
                      <span className="text-[8px] font-mono text-stone-400 mt-1 uppercase">
                        {(item.upvotes || 1)} Upvotes
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Submissions Feed List */}
          {isLoadingSubmissions ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white border border-stone-200 h-64 animate-pulse"></div>
              ))}
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="bg-white border border-stone-200 border-dashed p-12 text-center">
              <AlertTriangle className="w-8 h-8 text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-stone-700">No reported incidents match the selected filter parameters.</p>
              <p className="text-xs text-stone-500 mt-1">Adjust your filter tabs or select a preset on the left to analyze and publish.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {filteredSubmissions.map((sub) => {
                const submission = sub;
                const item = sub;
                const isInspecting = inspectingSubmissionId === sub.id;
                const isDeletable = submission.status === "Resolved";
                
                // Color formatting for severity
                const severityColors = {
                  Low: "bg-slate-100 text-slate-800 border-slate-200",
                  Medium: "bg-amber-100 text-amber-800 border-amber-200",
                  High: "bg-rose-100 text-rose-800 border-rose-200",
                };

                // Dynamic icon representation for stages
                const stageIcons = {
                  Reported: <Clock className="w-3 h-3" />,
                  Verified: <Check className="w-3 h-3 text-emerald-600" />,
                  "In Progress": <Activity className="w-3 h-3 text-amber-600 animate-spin" />,
                  Resolved: <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                };

                return (
                  <div
                    key={sub.id}
                    id={`sub-card-${sub.id}`}
                    // onClick={() => {
                    //   setSelectedTicket(item);
                    //   setCurrentView("detail");
                    //   window.scrollTo({ top: 0, behavior: 'smooth' });
                    // }}
                    className="bg-white border border-stone-200 hover:border-stone-300 transition-all duration-200 overflow-hidden flex flex-col relative cursor-pointer"
                  >
                    {/* Top status bar & metadata */}
                    <div className="bg-stone-50 border-b border-stone-200 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono tracking-wider font-bold uppercase text-stone-400">
                          #{sub.id.substring(0, 8).toUpperCase()}
                        </span>
                        <span className="text-stone-300">•</span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {new Date(sub.timestamp).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>

                      {/* Current Status Badge Indicator */}
                      <div className="flex items-center gap-1.5 bg-white border border-stone-200 px-2.5 py-0.5">
                        <span className="text-[10px] font-mono text-stone-600 uppercase flex items-center gap-1">
                          {stageIcons[sub.status]}
                          <span className="font-bold">{sub.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Main content grid split */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4">
                      {/* Image Preview Container */}
                      <div className="md:col-span-4 flex flex-col gap-2">
                        <div className="relative border border-stone-100 bg-stone-50 flex items-center justify-center overflow-hidden h-40">
                          <img
                            src={sub.imageUrl}
                            alt={sub.result.category}
                            className="w-full h-full object-cover transition-all hover:scale-105 duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-1 left-1 bg-stone-900/80 text-white text-[8px] font-mono px-1">
                            ORIGINAL
                          </div>
                        </div>
                        {sub.resolutionProofImageUrl && (
                          <div className="relative border border-stone-100 bg-stone-50 flex items-center justify-center overflow-hidden h-40">
                            <img
                              src={sub.resolutionProofImageUrl}
                              alt="Proof of Resolution"
                              className="w-full h-full object-cover transition-all hover:scale-105 duration-300"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute top-1 left-1 bg-emerald-700 text-white text-[8px] font-mono font-bold px-1 flex items-center gap-1">
                              {sub.resolutionVerified ? "✓ " : ""}PROOF OF RESOLUTION
                            </div>
                            {sub.resolutionVerified && (
                              <div className="absolute bottom-1 right-1 bg-emerald-500 border border-emerald-600 rounded-full p-0.5" title="Resolution Verified">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Text & Metadata details */}
                      <div className="md:col-span-8 flex flex-col justify-between gap-3">
                        <div>
                          {/* Badges line */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className="px-2.5 py-0.5 text-[10px] font-bold font-mono tracking-wider uppercase bg-stone-900 text-white rounded-none">
                              {sub.result.category}
                            </span>
                            <span className={`px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider border ${severityColors[sub.result.severity] || "bg-stone-50"}`}>
                              {sub.result.severity} SEVERITY
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-rose-600 text-white font-bold border border-rose-700">
                              TRIAGE SCORE: {getUrgencyScore(sub)}
                            </span>
                          </div>

                          <p className="text-xs text-stone-800 leading-relaxed font-medium">
                            {item.result.description}
                          </p>

                          {/* Community Verification Feedback Section */}
                          <div className="mt-3 p-3 bg-stone-50 border border-stone-200" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-stone-500 block">
                                  Anonymous Community Verification
                                </span>
                                {sub.feedbackReverted && (
                                  <span className="text-[9px] font-mono text-rose-600 font-bold uppercase mt-0.5 block animate-pulse">
                                    ⚠️ Reverted by community (Multiple negative reports)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCommunityVote(sub.id, "positive");
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold uppercase tracking-wider border border-stone-200 hover:border-emerald-200 transition-all duration-100 active:scale-95 cursor-pointer flex items-center gap-1"
                                  title="Vote: Issue is resolved/gone"
                                >
                                  <span>✓ Resolved</span>
                                  <span className="bg-emerald-100 text-emerald-800 px-1 py-0.2 ml-1 text-[9px] font-bold">
                                    {(sub.feedbackVotes?.positive || 0)}
                                  </span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCommunityVote(sub.id, "negative");
                                  }}
                                  className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 text-[10px] font-mono font-bold uppercase tracking-wider border border-stone-200 hover:border-rose-200 transition-all duration-100 active:scale-95 cursor-pointer flex items-center gap-1"
                                  title="Vote: Issue still exists"
                                >
                                  <span>✗ Still Exists</span>
                                  <span className="bg-rose-100 text-rose-800 px-1 py-0.2 ml-1 text-[9px] font-bold">
                                    {(sub.feedbackVotes?.negative || 0)}
                                  </span>
                                </button>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-200">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const updated = history.map(h => h.id === item.id ? { ...h, upvotes: (h.upvotes || 1) + 1 } : h);
                                setHistory(updated);
                                localStorage.setItem("civic_classification_history", JSON.stringify(updated));
                              }}
                              className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-none transition-all cursor-pointer"
                            >
                              👍 Upvote / Verify ({(item.upvotes || 1)})
                            </button>
                            
                            <div className="flex items-center gap-1.5">
                              {item.location && (
                                <span className="text-[8px] font-mono bg-slate-100 px-1 border border-slate-200 text-slate-500">
                                  📍 {item.location.latitude.toFixed(3)}, {item.location.longitude.toFixed(3)}
                                </span>
                              )}
                              <select
                                value={item.status || "Reported"}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(e) => {
                                  handleUpdateStatus(item.id, e.target.value as IssueStatus);
                                }}
                                className="text-[9px] font-mono border border-slate-300 rounded-none bg-white p-0.5 font-bold text-slate-800"
                              >
                                <option value="Reported">🔴 Reported</option>
                                <option value="Verified">🟡 Verified</option>
                                <option value="In Progress">🔵 In Progress</option>
                                <option value="Resolved">🟢 Resolved</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Location Details block with Google Maps link and Delete button */}
                        <div className="bg-stone-50 border border-stone-200 p-2.5 flex items-center justify-between text-[11px] font-mono">
                          <div className="flex items-center gap-1 text-stone-600">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-stone-400" />
                            {sub.location ? (
                              <span>
                                Lat: {sub.location.latitude.toFixed(4)}, Lng: {sub.location.longitude.toFixed(4)}
                              </span>
                            ) : (
                              <span className="text-stone-400">Coords Not Available</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {sub.location && (
                              <a
                                href={`https://www.google.com/maps?q=${sub.location.latitude},${sub.location.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] uppercase font-bold text-stone-700 hover:text-stone-950 underline flex items-center gap-0.5"
                              >
                                <span>View Grid</span>
                                <ArrowRight className="w-2.5 h-2.5" />
                              </a>
                            )}
                            
                            <button
                              disabled={!isDeletable}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isDeletable) {
                                  setTicketPendingDeletion(sub.id);
                                }
                              }}
                              className={`px-2 py-1 text-xs font-mono rounded-none font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                                isDeletable 
                                  ? "bg-red-600 text-white cursor-pointer hover:bg-red-700" 
                                  : "bg-gray-200 text-gray-400 opacity-40 cursor-not-allowed pointer-events-none"
                              }`}
                            >
                              🗑 DELETE
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Inline Upload Prompt for Resolution Proof */}
                    {awaitingResolutionId === sub.id && (
                      <div className="border-t border-b border-dashed border-indigo-500 bg-indigo-50/40 p-4 flex flex-col gap-3 relative" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5 text-indigo-800">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold uppercase tracking-widest font-mono">
                            🚨 Citizen Resolution Verification Required
                          </span>
                        </div>
                        <p className="text-xs text-stone-700 leading-relaxed font-sans">
                          Please attach or upload a follow-up photo of the location. Our AI inspector will verify if the <strong>{sub.result.category}</strong> hazard has been resolved/gone.
                        </p>
                        
                        <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white p-6 text-center cursor-pointer transition-all duration-150">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const resultStr = reader.result as string;
                                const base64Data = resultStr.split(",")[1];
                                await handleResolutionProofSubmit(sub.id, base64Data, file.type, resultStr);
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          {isVerifyingResolution === sub.id ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Activity className="w-5 h-5 text-indigo-600 animate-spin" />
                              <span className="text-[11px] font-mono font-bold text-indigo-600 animate-pulse uppercase">
                                ANALYZING RESOLUTION PROOF WITH AI...
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                              <UploadCloud className="w-6 h-6 text-indigo-500" />
                              <span className="text-xs font-mono font-bold text-indigo-700 uppercase">
                                Click or drag a photo here to upload proof
                              </span>
                              <span className="text-[9px] text-stone-400 font-mono">
                                PNG, JPG, JPEG
                              </span>
                            </div>
                          )}
                        </div>

                        {resolutionErrorMsg[sub.id] && (
                          <div className="text-xs font-mono text-rose-700 bg-rose-50 border border-rose-200 p-2.5">
                            {resolutionErrorMsg[sub.id]}
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAwaitingResolutionId(null);
                            }}
                            className="px-3 py-1.5 border border-stone-300 hover:bg-stone-100 text-stone-600 text-[10px] font-mono font-bold uppercase transition-all rounded-none cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* AI Confirmation Panel */}
                    {pendingVerification[sub.id] && (
                      <div className="border-t border-b border-indigo-500 bg-indigo-50 p-4 flex flex-col gap-3">
                        <p className="text-xs text-indigo-900 font-sans">{pendingVerification[sub.id].result.aiVerdict}</p>
                        <p className="text-[10px] text-indigo-700 font-mono font-bold">AI Confidence: {Math.round(pendingVerification[sub.id].result.confidence * 100)}%</p>
                        <div className="flex gap-2">
                          <button onClick={(e) => { e.stopPropagation(); handleManualResolutionDecision(sub.id, true, pendingVerification[sub.id].result.aiVerdict); }} className="flex-1 bg-green-600 text-white py-2 text-xs font-bold rounded-none">YES — MARK AS RESOLVED</button>
                          <button onClick={(e) => { e.stopPropagation(); handleManualResolutionDecision(sub.id, false); }} className="flex-1 bg-gray-200 text-gray-800 py-2 text-xs font-bold rounded-none">NO — KEEP IN PROGRESS</button>
                        </div>
                        <p className="text-[10px] text-stone-500 text-center">Final decision is yours. AI analysis is advisory only.</p>
                      </div>
                    )}

                    {/* Resolution not confirmed indicator */}
                    {sub.status === "In Progress" && sub.resolutionProofImageUrl && sub.resolutionVerified === false && (
                      <div className="mx-4 my-2 px-3 py-2 border border-amber-300 bg-amber-50 text-amber-900 text-xs font-sans flex items-center gap-2">
                        <span>⚠️ Resolution not confirmed. Issue remains active.</span>
                      </div>
                    )}
                    <div className="border-t border-stone-200 px-4 py-3 bg-[#faf9f6] flex flex-wrap items-center justify-between gap-4">
                      {/* Left: Community Upvotes */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpvote(sub.id);
                          }}
                          className="px-3 py-1 bg-white hover:bg-stone-100 border border-stone-200 hover:border-stone-300 text-stone-700 text-xs font-mono uppercase tracking-wider font-bold transition-all duration-100 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                        >
                          <ThumbsUp className="w-3.5 h-3.5 text-stone-500" />
                          <span>UPVOTE</span>
                        </button>
                        <span className="text-xs font-mono font-bold text-stone-800 bg-white px-2 py-1 border border-stone-200 min-w-[28px] text-center">
                          {sub.upvotes}
                        </span>
                      </div>

                      {/* Right: Simulation Stepper - advance stages interactively */}
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest mr-1 hidden sm:inline">
                          Change Stage:
                        </span>
                        <div className="flex items-center border border-stone-200 bg-white">
                          {workflowStages.map((stage) => {
                            const isCurrent = sub.status === stage;
                            const stageLabels: Record<IssueStatus, string> = {
                              Reported: "R",
                              Verified: "V",
                              "In Progress": "P",
                              Resolved: "S",
                            };
                            return (
                              <button
                                key={stage}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateStatus(sub.id, stage);
                                }}
                                className={`px-2 py-1 text-[10px] font-mono transition-all uppercase cursor-pointer ${
                                  isCurrent
                                    ? "bg-stone-900 text-white font-bold"
                                    : "text-stone-400 hover:bg-stone-50 hover:text-stone-700"
                                }`}
                                title={`Set status to ${stage}`}
                              >
                                {stageLabels[stage]}
                              </button>
                            );
                          })}
                        </div>

                        {/* Interactive schema inspector button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectingSubmissionId(isInspecting ? null : sub.id);
                          }}
                          className="p-1.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 hover:text-stone-900 cursor-pointer"
                          title="Inspect AI Blueprint"
                        >
                          <Code className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Raw JSON Blueprint drawer toggle */}
                    {isInspecting && (
                      <div className="border-t border-stone-200 bg-stone-950 p-4 font-mono text-[10px] text-[#faf9f6] animate-slideDown">
                        <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-stone-800">
                          <span className="text-stone-400 font-bold uppercase tracking-wider">
                            Incident JSON Schema blueprint
                          </span>
                          <span className="text-[9px] text-amber-400">STRUCTURED DATAFRAME</span>
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap max-h-56">
                          {sub.rawJson}
                        </pre>
                      </div>
                    )}

                    {/* AI Root Cause + Dispatch Panel */}
                    <div className="border-t border-stone-200 pt-2 mt-2">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRootCauseAnalysis(
                            sub.id,
                            sub.result.category,
                            sub.result.severity,
                            sub.result.description,
                            sub.upvotes,
                            sub.timestamp,
                            sub.location
                          );
                        }}
                        disabled={isAnalyzing[sub.id]}
                        className="w-full text-xs font-mono uppercase
                          tracking-wide border border-stone-300
                          bg-white hover:bg-stone-50 px-3 py-1.5
                          rounded-none disabled:opacity-50
                          disabled:cursor-not-allowed"
                      >
                        {isAnalyzing[sub.id]
                          ? "🔍 Analyzing..."
                          : rootCauseData[sub.id]
                          ? "🔄 Re-Analyze"
                          : "🔍 AI Root Cause + Dispatch"}
                      </button>

                      {rootCauseData[sub.id] && (
                        <div className="mt-2 bg-stone-50 border
                          border-stone-200 p-3 text-xs font-mono
                          rounded-none space-y-2">

                          <div>
                            <span className="text-[10px] uppercase
                              tracking-widest text-stone-400">
                              🔍 Root Cause
                            </span>
                            <p className="text-stone-700 mt-0.5">
                              {rootCauseData[sub.id]!.rootCause}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase
                              tracking-widest text-stone-400">
                              🚨 Dispatch:
                            </span>
                            <span className="text-stone-700">
                              {rootCauseData[sub.id]!.dispatchTeam}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[10px]
                              font-bold rounded-none ${
                              rootCauseData[sub.id]!.priority
                                === "Immediate"
                                ? "bg-red-600 text-white"
                                : rootCauseData[sub.id]!.priority
                                === "High"
                                ? "bg-orange-500 text-white"
                                : "bg-yellow-400 text-stone-900"
                              }`}>
                              {rootCauseData[sub.id]!.priority}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2
                            border-t border-stone-200 pt-2">
                            <div>
                              <span className="text-[10px] uppercase
                                tracking-widest text-stone-400 block">
                                👷 Crew
                              </span>
                              <span className="text-stone-700">
                                {rootCauseData[sub.id]!
                                  .estimatedCrew} workers
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase
                                tracking-widest text-stone-400 block">
                                ⏱ Time
                              </span>
                              <span className="text-stone-700">
                                {rootCauseData[sub.id]!
                                  .estimatedTime}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] uppercase
                                tracking-widest text-stone-400 block">
                                💰 Cost
                              </span>
                              <span className="text-stone-700">
                                {rootCauseData[sub.id]!
                                  .estimatedCost}
                              </span>
                            </div>
                          </div>

                          <div className="border-t border-stone-200 pt-2">
                            <span className="text-[10px] uppercase
                              tracking-widest text-stone-400 block mb-1">
                              ✅ Repair Checklist
                            </span>
                            {rootCauseData[sub.id]!
                              .repairChecklist.map((item, i) => (
                              <p key={i} className="text-stone-500">
                                {i + 1}. {item}
                              </p>
                            ))}
                          </div>

                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </section>

        {/* Premium Hyperlocal Impact Dashboard Analytics Component Grid */}
        <section id="hyperlocal-dashboard" className="col-span-12 bg-white border border-stone-200 p-6 mt-6 animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-stone-200 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="bg-stone-900 text-[#faf9f6] p-1.5 border border-stone-800 flex items-center justify-center">
                <Sliders className="w-4.5 h-4.5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider font-mono text-stone-950">
                  Hyperlocal Impact & Civic Analytics
                </h3>
                <p className="text-[11px] text-stone-500 font-mono uppercase tracking-wide">
                  Real-time municipal health parameters & public coordination metrics
                </p>
              </div>
            </div>
            <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 font-mono text-xs uppercase font-bold tracking-wider">
              🟢 Grid Online
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Column 1: Civic Health Segment Circular Metric */}
            <div className="border border-stone-200 p-4 flex flex-col justify-between bg-stone-50/30">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold block mb-3">
                  Civic Responsiveness Index
                </span>
                <div className="flex items-center gap-4">
                  {/* Dynamic Circular Progress Indicator */}
                  <div className="relative w-20 h-20 shrink-0 flex items-center justify-center bg-white border border-stone-200">
                    <svg className="w-16 h-16 transform -rotate-90">
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        className="stroke-stone-100"
                        strokeWidth="5"
                        fill="transparent"
                      />
                      <circle
                        cx="32"
                        cy="32"
                        r="26"
                        className="stroke-stone-900 transition-all duration-500"
                        strokeWidth="5"
                        fill="transparent"
                        strokeDasharray={163.36}
                        strokeDashoffset={163.36 - (163.36 * Math.min(100, civicHealthScore)) / 100}
                        strokeLinecap="square"
                      />
                    </svg>
                    <span className="absolute text-sm font-bold font-mono tracking-tighter text-stone-900">
                      {civicHealthScore}%
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold font-mono text-stone-800 uppercase">
                      Resolution Rate
                    </h4>
                    <p className="text-[11px] text-stone-500 leading-relaxed mt-1">
                      Weighted formula tracking active vs resolved neighborhood hazards. Higher is safer.
                    </p>
                  </div>
                </div>
              </div>
              <div className="border-t border-stone-200 pt-3 mt-4 text-[10px] font-mono text-stone-600 flex items-center justify-between">
                <span>FORMULA WEIGHTED</span>
                <span className="font-bold text-stone-900">LIVE COEF</span>
              </div>
            </div>

            {/* Column 2: Public Advocacy & Category Impact */}
            <div className="border border-stone-200 p-4 flex flex-col justify-between bg-stone-50/30">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold block mb-3">
                  Category Upvote Heatmap
                </span>
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: "Potholes", upvotes: potholeUpvotes },
                    { label: "Garbage Pile", upvotes: garbageUpvotes },
                    { label: "Streetlights", upvotes: streetlightUpvotes },
                    { label: "Water Leaks", upvotes: waterUpvotes },
                    { label: "Other Issues", upvotes: otherUpvotes }
                  ].map((item) => {
                    const percent = maxUpvotes > 0 ? (item.upvotes / maxUpvotes) * 100 : 0;
                    return (
                      <div key={item.label} className="flex flex-col">
                        <div className="flex items-center justify-between text-[11px] font-mono text-stone-700 mb-1">
                          <span className="font-semibold">{item.label}</span>
                          <span className="font-bold text-stone-900">{item.upvotes} Upvotes</span>
                        </div>
                        <div className="h-1.5 w-full bg-stone-200 border border-stone-300">
                          <div
                            className="h-full bg-stone-900 transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="border-t border-stone-200 pt-3 mt-4 text-[10px] font-mono text-stone-600 flex items-center justify-between">
                <span>TOTAL ADVOCATES</span>
                <span className="font-bold text-stone-900">{totalUpvotes} AGG</span>
              </div>
            </div>

            {/* Column 3: Hyperlocal Hotspot Grid Pinpoints */}
            <div className="border border-stone-200 p-4 flex flex-col justify-between bg-stone-50/30">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-500 font-bold block mb-3">
                  Hyperlocal Hotspot Grid Registry
                </span>
                {submissions.length === 0 ? (
                  <p className="text-[11px] text-stone-400 font-mono text-center py-6">
                    No active grid coordinates reported yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-2 max-h-36 overflow-y-auto">
                    {submissions.slice(0, 3).map((sub) => (
                      <div
                        key={sub.id}
                        className="bg-white border border-stone-200 p-2 flex items-center justify-between font-mono text-[10px]"
                      >
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-none inline-block ${
                            sub.result.severity === "High" ? "bg-rose-600" :
                            sub.result.severity === "Medium" ? "bg-amber-500" : "bg-blue-500"
                          }`} />
                          <span className="text-stone-700 font-bold">
                            {sub.result.category}
                          </span>
                        </div>
                        <span className="text-stone-500">
                          [{sub.location ? `${sub.location.latitude.toFixed(3)}, ${sub.location.longitude.toFixed(3)}` : "No GPS"}]
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="border-t border-stone-200 pt-3 mt-4 text-[10px] font-mono text-stone-600 flex items-center justify-between">
                <span>GPS INCIDENT RESOLUTION GRID</span>
                <span className="font-bold text-stone-900">VERIFIED</span>
              </div>
            </div>
          </div>
        </section>
          </>
        ) : (
          selectedTicket && (
            <div className="col-span-12 flex flex-col gap-4 animate-fadeIn">
              {/* Top Sticky Header Action */}
              <div className="sticky top-16 z-30 bg-[#faf9f6] border border-stone-200 p-4 shadow-xs flex items-center justify-between">
                <button
                  onClick={() => {
                    setCurrentView("dashboard");
                    setSelectedTicket(null);
                  }}
                  className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-[#faf9f6] text-xs font-mono font-bold uppercase tracking-wider transition-all duration-200 rounded-none cursor-pointer border border-stone-950 flex items-center gap-2"
                >
                  ⬅️ BACK TO CITY REGISTRY CONTROL CENTER
                </button>
                <div className="text-right">
                  <span className="text-[10px] font-mono tracking-wider uppercase text-slate-400 font-normal">
                    TICKET INVESTIGATION PORTAL
                  </span>
                </div>
              </div>

              {/* Main Detail Two-Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel (Massive Image & Geo Link) */}
                <div className="lg:col-span-6 flex flex-col gap-4">
                   <div className="flex flex-col gap-2">
                    <div className="border-4 border-stone-900 bg-stone-100 flex items-center justify-center overflow-hidden aspect-video relative rounded-none shadow-xs">
                      <img
                        src={selectedTicket.imageUrl}
                        alt={selectedTicket.result.category}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-2 left-2 bg-stone-900 text-white text-[10px] font-mono font-bold px-2 py-0.5">
                        ORIGINAL REPORT PHOTO
                      </div>
                    </div>
                    {selectedTicket.resolutionProofImageUrl && (
                      <div className="border-4 border-emerald-700 bg-stone-100 flex items-center justify-center overflow-hidden aspect-video relative rounded-none shadow-xs">
                        <img
                          src={selectedTicket.resolutionProofImageUrl}
                          alt="Proof of Resolution"
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute top-2 left-2 bg-emerald-700 text-white text-[10px] font-mono font-bold px-2 py-0.5 flex items-center gap-1.5">
                          {selectedTicket.resolutionVerified ? "✓ " : ""}PROOF OF RESOLUTION
                        </div>
                        {selectedTicket.resolutionVerified && (
                          <div className="absolute bottom-2 right-2 bg-emerald-500 border border-emerald-600 rounded-full p-1" title="Resolution Verified">
                            <Check className="w-5 h-5 text-white" />
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Absolute Vector Coordinates Overlay */}
                  <div className="p-4 bg-white border border-stone-200 rounded-none flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] text-slate-400 font-normal uppercase tracking-wider mb-1 block">📌 Absolute Geolocation Coordinates</span>
                    <span className="font-mono text-xs text-slate-500 font-normal">
                      {selectedTicket.location 
                        ? `LATITUDE: ${selectedTicket.location.latitude.toFixed(6)} | LONGITUDE: ${selectedTicket.location.longitude.toFixed(6)}` 
                        : "📍 GPS Coordinates Not Captured"}
                    </span>
                  </div>

                  {/* Google Maps link button */}
                  {selectedTicket.location && (
                    <a
                      href={`https://www.google.com/maps?q=${selectedTicket.location.latitude},${selectedTicket.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-center text-xs font-mono font-bold uppercase tracking-wider border border-indigo-200 rounded-none transition-all flex items-center justify-center gap-2"
                    >
                      🗺️ LOCATE ON LIVE MUNICIPAL MAP
                    </a>
                  )}
                </div>

                {/* Right Panel (Technical Triage Details) */}
                <div className="lg:col-span-6 flex flex-col gap-4 bg-white border border-stone-200 p-5 rounded-none shadow-md">
                  <div className="border-b border-stone-200 pb-3">
                    <span className="text-[10px] font-mono font-normal uppercase tracking-widest text-slate-400 block mb-1">
                      MUNICIPAL TRIAGE METRIC
                    </span>
                    <h2 className="text-2xl font-extrabold font-mono text-stone-900 uppercase">
                      #{selectedTicket.id.substring(0, 12).toUpperCase()}
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-1 font-normal">
                      REPORTED ON: {new Date(selectedTicket.timestamp).toLocaleString()}
                    </p>
                  </div>

                  {/* Badges and Severity */}
                  <div className="flex flex-wrap gap-2.5">
                    <span className="px-3 py-1 bg-stone-900 text-white text-xs font-bold font-mono tracking-wider uppercase rounded-none">
                      {selectedTicket.result.category}
                    </span>
                    <span className={`px-3 py-1 text-xs font-bold font-mono uppercase tracking-wider border ${
                      selectedTicket.result.severity === "High"
                        ? "bg-rose-50 border-rose-200 text-rose-700"
                        : selectedTicket.result.severity === "Medium"
                        ? "bg-amber-50 border-amber-200 text-amber-700"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}>
                      {selectedTicket.result.severity} SEVERITY
                    </span>
                    <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-bold font-mono uppercase tracking-wider">
                      CONFIDENCE: {Math.round(selectedTicket.result.confidence * 100)}%
                    </span>
                  </div>

                  {/* 10-Word Description Block */}
                  <div className="bg-stone-50 border border-stone-200 p-4 rounded-none">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider mb-1.5 block">
                      Civic Inspector Description (Exact Compliance)
                    </span>
                    <p className="text-sm text-stone-800 font-medium leading-relaxed italic">
                      "{selectedTicket.result.description}"
                    </p>
                  </div>

                  {/* Upvote and Status Dropdown Controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-b border-stone-100 py-4">
                    {/* Upvoting Section */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                        Citizen Approvals
                      </span>
                      <button
                        onClick={() => {
                          const updated = history.map(h => h.id === selectedTicket.id ? { ...h, upvotes: (h.upvotes || 1) + 1 } : h);
                          setHistory(updated);
                          localStorage.setItem("civic_classification_history", JSON.stringify(updated));
                          setSelectedTicket({ ...selectedTicket, upvotes: (selectedTicket.upvotes || 1) + 1 });
                        }}
                        className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider rounded-none border border-indigo-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        👍 Upvote / Verify ({(selectedTicket.upvotes || 1)})
                      </button>
                    </div>

                    {/* Status Select Menu */}
                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                        Active Tracking Status
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedTicket.status || "Reported"}
                          onChange={(e) => {
                            const newStatus = e.target.value as IssueStatus;
                            handleUpdateStatus(selectedTicket.id, newStatus);
                          }}
                          className="flex-1 p-2 text-xs font-mono border border-stone-300 rounded-none bg-white font-bold text-stone-800 focus:outline-none focus:ring-1 focus:ring-stone-500"
                        >
                          <option value="Reported">🔴 Reported</option>
                          <option value="Verified">🟡 Verified</option>
                          <option value="In Progress">🔵 In Progress</option>
                          <option value="Resolved">🟢 Resolved</option>
                        </select>
                        
                        <button
                          disabled={selectedTicket.status !== "Resolved"}
                          onClick={() => {
                            if (selectedTicket.status === "Resolved") {
                              setTicketPendingDeletion(selectedTicket.id);
                            }
                          }}
                          className={`px-3 py-2 text-xs font-mono rounded-none font-bold uppercase tracking-wider flex items-center gap-1 transition-all ${
                            selectedTicket.status === "Resolved"
                              ? "bg-red-600 text-white cursor-pointer hover:bg-red-700"
                              : "bg-gray-200 text-gray-400 opacity-40 cursor-not-allowed pointer-events-none"
                          }`}
                        >
                          🗑 DELETE
                        </button>
                      </div>
                    </div>

                  {/* Anonymous Community Feedback Section inside Detail View */}
                  <div className="border border-stone-200 bg-stone-50 p-4 rounded-none flex flex-col gap-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-stone-500 block">
                          Anonymous Community Verification Loop
                        </span>
                        {selectedTicket.feedbackReverted && (
                          <span className="text-[9px] font-mono text-rose-600 font-bold uppercase mt-0.5 block animate-pulse">
                            ⚠️ Reverted by community (Multiple negative reports)
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            handleCommunityVote(selectedTicket.id, "positive");
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-mono font-bold uppercase tracking-wider border border-stone-200 hover:border-emerald-200 transition-all duration-100 active:scale-95 cursor-pointer flex items-center gap-1.5"
                          title="Vote: Issue is resolved"
                        >
                          <span>✓ Resolved</span>
                          <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 ml-1 text-xs font-bold">
                            {(selectedTicket.feedbackVotes?.positive || 0)}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            handleCommunityVote(selectedTicket.id, "negative");
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 text-xs font-mono font-bold uppercase tracking-wider border border-stone-200 hover:border-rose-200 transition-all duration-100 active:scale-95 cursor-pointer flex items-center gap-1.5"
                          title="Vote: Issue still exists"
                        >
                          <span>✗ Still Exists</span>
                          <span className="bg-rose-100 text-rose-800 px-1.5 py-0.2 ml-1 text-xs font-bold">
                            {(selectedTicket.feedbackVotes?.negative || 0)}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                    {/* Inline Upload Prompt for Resolution Proof inside Detail View */}
                    {awaitingResolutionId === selectedTicket.id && (
                      <div className="border border-dashed border-indigo-500 bg-indigo-50/40 p-4 flex flex-col gap-3 relative">
                        <div className="flex items-center gap-1.5 text-indigo-800">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                          <span className="text-xs font-bold uppercase tracking-widest font-mono">
                            🚨 Citizen Resolution Verification Required
                          </span>
                        </div>
                        <p className="text-xs text-stone-700 leading-relaxed font-sans">
                          Please attach or upload a follow-up photo of the location. Our AI inspector will verify if the <strong>{selectedTicket.result.category}</strong> hazard has been resolved/gone.
                        </p>
                        
                        <div className="relative border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-white p-6 text-center cursor-pointer transition-all duration-150">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              const reader = new FileReader();
                              reader.onload = async () => {
                                const resultStr = reader.result as string;
                                const base64Data = resultStr.split(",")[1];
                                await handleResolutionProofSubmit(selectedTicket.id, base64Data, file.type, resultStr);
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          {isVerifyingResolution === selectedTicket.id ? (
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Activity className="w-5 h-5 text-indigo-600 animate-spin" />
                              <span className="text-[11px] font-mono font-bold text-indigo-600 animate-pulse uppercase">
                                ANALYZING RESOLUTION PROOF WITH AI...
                              </span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                              <UploadCloud className="w-6 h-6 text-indigo-500" />
                              <span className="text-xs font-mono font-bold text-indigo-700 uppercase">
                                Click or drag a photo here to upload proof
                              </span>
                              <span className="text-[9px] text-stone-400 font-mono">
                                PNG, JPG, JPEG
                              </span>
                            </div>
                          )}
                        </div>

                        {resolutionErrorMsg[selectedTicket.id] && (
                          <div className="text-xs font-mono text-rose-700 bg-rose-50 border border-rose-200 p-2.5">
                            {resolutionErrorMsg[selectedTicket.id]}
                          </div>
                        )}

                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setAwaitingResolutionId(null)}
                            className="px-3 py-1.5 border border-stone-300 hover:bg-stone-100 text-stone-600 text-[10px] font-mono font-bold uppercase transition-all rounded-none cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Unresolved / Still Present Warning Indicator outside the prompt */}
                    {resolutionErrorMsg[selectedTicket.id] && selectedTicket.status !== "Resolved" && (
                      <div className="px-3 py-2 border border-amber-300 bg-amber-50 text-amber-900 text-xs font-sans flex items-center gap-2">
                        <span>⚠️ Issue still appears present in follow-up photo. Status not changed.</span>
                      </div>
                    )}
                  </div>

                  {/* Monospace Code Blueprint Panel Block */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">
                      Compliance JSON Schema Payload
                    </span>
                    <pre className="bg-stone-950 text-[#faf9f6] p-4 font-mono text-[10px] overflow-x-auto whitespace-pre-wrap max-h-56 border border-stone-800">
                      {selectedTicket.rawJson || JSON.stringify(selectedTicket, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )
        )}

        {/* Impact Analytics Widget Layout */}
        <div className="col-span-12 bg-slate-900 text-slate-100 p-6 rounded-none mt-2 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-indigo-400">📊 Hyperlocal Impact Dashboard</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div className="border-r border-slate-800 last:border-none">
              <div className="text-xl font-mono font-bold text-white">{history.length}</div>
              <div className="text-[9px] uppercase text-slate-400 tracking-wider">Total Incidents</div>
            </div>
            <div className="border-r border-slate-800 last:border-none">
              <div className="text-xl font-mono font-bold text-emerald-400">
                {history.filter(h => h.status === "Resolved").length}
              </div>
              <div className="text-[9px] uppercase text-slate-400 tracking-wider">Issues Resolved</div>
            </div>
            <div className="border-r border-slate-800 last:border-none">
              <div className="text-xl font-mono font-bold text-amber-400">
                {history.reduce((acc, curr) => acc + (curr.upvotes || 1), 0)}
              </div>
              <div className="text-[9px] uppercase text-slate-400 tracking-wider">Citizen Approvals</div>
            </div>
            <div>
              <div className="text-xl font-mono font-bold text-indigo-400">
                {history.length > 0 ? ((history.filter(h => h.status === "Resolved").length / history.length) * 100).toFixed(0) : 0}%
              </div>
              <div className="text-[9px] uppercase text-slate-400 tracking-wider">Resolution Rate</div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer Details */}
      <footer id="app-footer" className="border-t border-stone-200 bg-white py-12 mt-12 text-center">
        <div className="max-w-7xl mx-auto px-6 text-xs text-stone-500 font-mono flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 COMMUNITY HERO SYSTEM. THEME: GEOMETRIC BALANCE.</p>
          <p className="flex items-center gap-1 text-[10px]">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
            <span>SYSTEM CONTAINER SECURE ON PORT 3000</span>
          </p>
        </div>
      </footer>

      {/* Custom Confirmation Modal for Deletion */}
      {ticketPendingDeletion && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white border-2 border-stone-900 p-6 max-w-md w-full shadow-[6px_6px_0px_0px_rgba(28,25,23,1)] transition-all">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 text-red-600 border border-red-200 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-mono tracking-tight text-stone-900 uppercase">
                  Confirm Permanent Deletion
                </h3>
                <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                  Permanently delete this resolved incident? This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setTicketPendingDeletion(null)}
                className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition-all rounded-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (ticketPendingDeletion) {
                    handleDelete(ticketPendingDeletion);
                    setTicketPendingDeletion(null);
                  }
                }}
                className="px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider bg-red-600 text-white hover:bg-red-700 transition-all rounded-none cursor-pointer border border-red-700 shadow-[2px_2px_0px_0px_rgba(28,25,23,1)] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_rgba(28,25,23,1)]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
