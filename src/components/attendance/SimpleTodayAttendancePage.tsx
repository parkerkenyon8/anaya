import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, Users, CheckCircle, Clock, Plus } from "lucide-react";
import { getAllMembers, Member } from "@/services/memberService";
import { getAllPayments, addSessionPayment } from "@/services/paymentService";
import { formatDate, formatNumber, formatTimeAlgeria } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";

const SimpleTodayAttendancePage = () => {
  const [todayAttendees, setTodayAttendees] = useState<
    (Member & { isSessionPayment?: boolean })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [showAddSessionDialog, setShowAddSessionDialog] = useState(false);

  useEffect(() => {
    const fetchTodayAttendees = async () => {
      setLoading(true);
      try {
        const [members, payments] = await Promise.all([
          getAllMembers(),
          getAllPayments(),
        ]);

        const today = new Date().toISOString().split("T")[0];

        // Get members who attended today
        const todayAttendanceMembers = members.filter(
          (member) =>
            member.lastAttendance &&
            member.lastAttendance.split("T")[0] === today,
        );

        // Get session payments from today
        const todaySessionPayments = payments.filter(
          (payment) =>
            payment.subscriptionType === "حصة واحدة" &&
            payment.date.split("T")[0] === today,
        );

        // Create session payment members for display
        const sessionPaymentMembers = todaySessionPayments.map(
          (payment, index) => ({
            id: payment.memberId,
            name:
              payment.notes?.split(" - ")[1]?.split(" (")[0] ||
              `زائر ${index + 1}`,
            membershipStatus: "active" as const,
            lastAttendance: payment.date,
            paymentStatus: "paid" as const,
            isSessionPayment: true,
            phoneNumber: payment.notes?.match(/\(([^)]+)\)/)?.[1] || "",
          }),
        );

        // Combine both types
        const allTodayAttendees = [
          ...todayAttendanceMembers,
          ...sessionPaymentMembers,
        ];

        setTodayAttendees(allTodayAttendees);
      } catch (error) {
        console.error("Error fetching today's attendees:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTodayAttendees();
  }, []);

  // Play success sound function - memoized
  const playSuccessSound = useCallback(async () => {
    try {
      const audio = new Audio("/success-sound.mp3");
      audio.volume = 0.7;
      await audio.play();
    } catch (error) {
      // Fallback beep sound
      try {
        const audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        oscillator.type = "sine";
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
          0.01,
          audioContext.currentTime + 0.3,
        );
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } catch (fallbackError) {
        console.error("Sound failed:", fallbackError);
      }
    }
  }, []);

  // Get current session price from settings - memoized
  const getCurrentSessionPrice = useMemo(() => {
    const savedPricing = localStorage.getItem("gymPricingSettings");
    if (savedPricing) {
      try {
        const pricing = JSON.parse(savedPricing);
        return pricing.singleSession || 200;
      } catch (error) {
        console.error("Error loading pricing:", error);
      }
    }
    return 200;
  }, []);

  // Handle add session function - memoized
  const handleAddSession = useCallback(async () => {
    try {
      const { payment, memberId } = await addSessionPayment("عضو مؤقت");
      const sessionPrice = getCurrentSessionPrice;

      toast({
        title: "تم بنجاح",
        description: `تم تسجيل حصة واحدة - ${formatNumber(sessionPrice)} دج`,
      });

      playSuccessSound();

      // Refresh the attendees list
      const fetchTodayAttendees = async () => {
        setLoading(true);
        try {
          const [members, payments] = await Promise.all([
            getAllMembers(),
            getAllPayments(),
          ]);

          const today = new Date().toISOString().split("T")[0];

          // Get members who attended today
          const todayAttendanceMembers = members.filter(
            (member) =>
              member.lastAttendance &&
              member.lastAttendance.split("T")[0] === today,
          );

          // Get session payments from today
          const todaySessionPayments = payments.filter(
            (payment) =>
              payment.subscriptionType === "حصة واحدة" &&
              payment.date.split("T")[0] === today,
          );

          // Create session payment members for display
          const sessionPaymentMembers = todaySessionPayments.map(
            (payment, index) => ({
              id: payment.memberId,
              name:
                payment.notes?.split(" - ")[1]?.split(" (")[0] ||
                `زائر ${index + 1}`,
              membershipStatus: "active" as const,
              lastAttendance: payment.date,
              paymentStatus: "paid" as const,
              isSessionPayment: true,
              phoneNumber: payment.notes?.match(/\(([^)]+)\)/)?.[1] || "",
            }),
          );

          // Combine both types
          const allTodayAttendees = [
            ...todayAttendanceMembers,
            ...sessionPaymentMembers,
          ];

          setTodayAttendees(allTodayAttendees);
        } catch (error) {
          console.error("Error fetching today's attendees:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchTodayAttendees();
    } catch (error) {
      console.error("Error adding session:", error);
      const errorMessage =
        error instanceof Error ? error.message : "حدث خطأ أثناء تسجيل الحصة";
      toast({
        title: "خطأ",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setShowAddSessionDialog(false);
    }
  }, [getCurrentSessionPrice, playSuccessSound]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white scrollbar-hide">
      <div className="container mx-auto px-3 sm:px-4 pt-4 pb-36 sm:pb-32 lg:pt-6 lg:pb-6 scrollbar-hide">
        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            حضور اليوم
          </h2>
        </div>

        {/* Add Session Button - Circular */}
        <div className="mb-6 flex justify-center">
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowAddSessionDialog(true)}
              className="p-3 rounded-full bg-gradient-to-r from-yellow-500 to-yellow-600 shadow-2xl border-2 border-white/30 backdrop-blur-sm cursor-pointer hover:scale-110 active:scale-90 transition-all duration-200"
            >
              <Plus size={20} className="text-white" />
            </button>
            <span className="text-yellow-400 font-medium text-xs mt-1">
              إضافة حصة
            </span>
          </div>
        </div>
        {/* Attendees List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : todayAttendees.length === 0 ? (
          <div className="text-center py-20 bg-gradient-to-br from-bluegray-800/80 to-bluegray-900/80 backdrop-blur-xl border border-bluegray-600/50 shadow-2xl rounded-2xl">
            <Calendar className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">
              لا يوجد حضور اليوم
            </h3>
            <p className="text-gray-400">لم يسجل أي عضو حضوره اليوم بعد</p>
          </div>
        ) : (
          <div className="space-y-4">
            {todayAttendees.map((attendee, index) => (
              <div
                key={attendee.id || index}
                className="group flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-slate-800/60 via-slate-700/40 to-slate-800/60 hover:from-slate-700/70 hover:via-slate-600/50 hover:to-slate-700/70 border border-slate-600/30 hover:border-slate-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl backdrop-blur-sm"
                style={{
                  animationDelay: `${index * 100}ms`,
                  animation: "fadeInUp 0.6s ease-out forwards",
                }}
              >
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-slate-700/80 to-slate-800/80 flex items-center justify-center ring-2 ring-slate-600/40 group-hover:ring-slate-500/60 transition-all duration-300 shadow-lg">
                  {attendee.imageUrl ? (
                    <img
                      src={attendee.imageUrl}
                      alt={attendee.name}
                      className="w-full h-full rounded-full object-cover border-2 border-slate-600/50"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center text-white text-lg font-semibold">
                      {attendee.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .slice(0, 2)}
                    </div>
                  )}
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full border-2 border-slate-800 shadow-lg flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-slate-100 group-hover:text-white transition-colors duration-200 truncate text-base">
                      {attendee.name}
                    </p>
                    <Badge
                      variant="secondary"
                      className={`text-xs px-2 py-1 ${
                        attendee.isSessionPayment
                          ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                          : !attendee.isSessionPayment &&
                              (attendee.paymentStatus === "unpaid" ||
                                attendee.paymentStatus === "partial" ||
                                attendee.membershipStatus === "pending" ||
                                (attendee.sessionsRemaining !== undefined &&
                                  attendee.sessionsRemaining === 0) ||
                                (attendee.membershipStartDate &&
                                  new Date() >
                                    new Date(
                                      new Date(
                                        attendee.membershipStartDate,
                                      ).setMonth(
                                        new Date(
                                          attendee.membershipStartDate,
                                        ).getMonth() + 1,
                                      ),
                                    )))
                            ? "bg-red-500/20 text-red-300 border-red-500/30"
                            : "bg-green-500/20 text-green-300 border-green-500/30"
                      }`}
                    >
                      {attendee.isSessionPayment
                        ? "حصة مؤقتة"
                        : !attendee.isSessionPayment &&
                            (attendee.paymentStatus === "unpaid" ||
                              attendee.paymentStatus === "partial" ||
                              attendee.membershipStatus === "pending" ||
                              (attendee.sessionsRemaining !== undefined &&
                                attendee.sessionsRemaining === 0) ||
                              (attendee.membershipStartDate &&
                                new Date() >
                                  new Date(
                                    new Date(
                                      attendee.membershipStartDate,
                                    ).setMonth(
                                      new Date(
                                        attendee.membershipStartDate,
                                      ).getMonth() + 1,
                                    ),
                                  )))
                          ? "غير مدفوع"
                          : "مدفوع"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="h-3 w-3 text-slate-400" />
                    <p className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors duration-200">
                      {formatTimeAlgeria(attendee.lastAttendance).split(" ")[1]}
                    </p>
                  </div>
                  {!attendee.isSessionPayment &&
                    attendee.sessionsRemaining !== undefined && (
                      <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors duration-200 mt-1 truncate hidden sm:block">
                        الحصص المتبقية:{" "}
                        {formatNumber(attendee.sessionsRemaining)} حصة
                      </p>
                    )}
                  {attendee.phoneNumber && (
                    <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors duration-200 mt-1 truncate hidden sm:block">
                      📱 {attendee.phoneNumber}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Session Dialog */}
      <Dialog
        open={showAddSessionDialog}
        onOpenChange={setShowAddSessionDialog}
      >
        <DialogContent className="bg-slate-800 text-white border-slate-700 max-w-md w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
              إضافة حصة واحدة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="text-center p-4 bg-green-500/10 rounded-lg border border-green-500/20">
              <p className="text-green-400 font-semibold">
                سعر الحصة الواحدة: {formatNumber(getCurrentSessionPrice)} دج
              </p>
            </div>

            <div className="text-center p-4 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <p className="text-blue-400">هل أنت متأكد من إضافة حصة واحدة؟</p>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAddSessionDialog(false)}
              className="border-slate-600 text-gray-300 hover:bg-slate-700"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddSession}
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            >
              تسجيل الحصة - {formatNumber(getCurrentSessionPrice)} دج
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SimpleTodayAttendancePage;
