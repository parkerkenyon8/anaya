import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  getAllPayments,
  Payment,
  deletePayment,
  calculateSubscriptionPrice,
} from "@/services/paymentService";
import { getMemberById, getAllMembers } from "@/services/memberService";
import {
  Calendar,
  CreditCard,
  Trash2,
  RefreshCw,
  Edit,
  MoreVertical,
  Activity,
  ArrowUpRight,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface PaymentsListProps {
  onRefresh?: number;
  onEditPayment?: (payment: Payment) => void;
  ref?: React.Ref<{ fetchPayments: () => Promise<void> }>;
}

const PaymentsList = forwardRef(
  ({ onRefresh, onEditPayment }: PaymentsListProps = {}, ref) => {
    const [payments, setPayments] = useState<
      (Payment & { memberName?: string })[]
    >([]);
    const [partialPayments, setPartialPayments] = useState<
      Array<{
        memberName: string;
        amount: number;
        subscriptionType?: string;
        memberId: string;
      }>
    >([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
    const [paymentToDelete, setPaymentToDelete] = useState<Payment | null>(
      null,
    );

    const fetchPayments = async () => {
      setIsLoading(true);
      try {
        const allPayments = await getAllPayments();
        const allMembers = await getAllMembers();

        // Enhance payments with member names and preserve member-specific pricing
        const enhancedPayments = await Promise.all(
          allPayments.map(async (payment) => {
            try {
              const member = await getMemberById(payment.memberId);

              // Prioritize member's saved subscription price over default pricing
              let displayAmount = payment.amount;

              if (
                member &&
                member.subscriptionPrice &&
                member.subscriptionPrice > 0
              ) {
                // Use the member's saved subscription price if available
                displayAmount = member.subscriptionPrice;
              } else if (payment.subscriptionType) {
                // Fallback to calculated price based on subscription type
                displayAmount = calculateSubscriptionPrice(
                  payment.subscriptionType,
                );
              }

              return {
                ...payment,
                memberName: member?.name || "عضو غير معروف",
                // Use member-specific pricing or calculated pricing
                amount: displayAmount,
                // Keep original amount for reference
                originalAmount: payment.amount,
              };
            } catch (error) {
              return {
                ...payment,
                memberName: "عضو غير معروف",
                // Fallback to original amount or calculated pricing
                amount:
                  payment.amount ||
                  calculateSubscriptionPrice(payment.subscriptionType),
                originalAmount: payment.amount,
              };
            }
          }),
        );

        // Get partial payments from members with their subscription prices
        const partialPaymentsList = allMembers
          .filter(
            (member) =>
              member.paymentStatus === "partial" &&
              member.partialPaymentAmount &&
              member.partialPaymentAmount > 0,
          )
          .map((member) => ({
            memberName: member.name,
            amount: member.partialPaymentAmount || 0,
            subscriptionType: member.subscriptionType,
            memberId: member.id,
            totalSubscriptionPrice:
              member.subscriptionPrice ||
              calculateSubscriptionPrice(member.subscriptionType || "شهري"),
          }));

        // Sort by date (newest first)
        const sortedPayments = enhancedPayments.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );

        setPayments(sortedPayments);
        setPartialPayments(partialPaymentsList);
      } catch (error) {
        console.error("Error fetching payments:", error);
      } finally {
        setIsLoading(false);
      }
    };

    useEffect(() => {
      fetchPayments();
    }, [onRefresh]);

    // Listen for pricing updates and member updates to refresh payments list
    useEffect(() => {
      const handlePricingUpdate = () => {
        console.log("PaymentsList: Pricing updated, refreshing payments");
        // Add a small delay to ensure localStorage is updated
        setTimeout(() => {
          fetchPayments();
        }, 100);
      };

      const handleMemberUpdate = (event: CustomEvent) => {
        console.log(
          "PaymentsList: Member updated, refreshing payments",
          event.detail,
        );
        // Refresh payments when member data is updated
        setTimeout(() => {
          fetchPayments();
        }, 100);
      };

      window.addEventListener("pricing-updated", handlePricingUpdate);
      window.addEventListener("storage", handlePricingUpdate);
      window.addEventListener("paymentsUpdated", handlePricingUpdate);
      window.addEventListener(
        "memberUpdated",
        handleMemberUpdate as EventListener,
      );

      return () => {
        window.removeEventListener("pricing-updated", handlePricingUpdate);
        window.removeEventListener("storage", handlePricingUpdate);
        window.removeEventListener("paymentsUpdated", handlePricingUpdate);
        window.removeEventListener(
          "memberUpdated",
          handleMemberUpdate as EventListener,
        );
      };
    }, []);

    // Expose the fetchPayments method to parent components via ref
    React.useImperativeHandle(ref, () => ({
      fetchPayments,
    }));

    const formatPaymentDate = (dateString: string) => {
      return formatDate(dateString);
    };

    const getPaymentMethodIcon = (method: string) => {
      switch (method) {
        case "cash":
          return <CreditCard className="h-4 w-4 text-green-400" />;
        case "card":
          return <CreditCard className="h-4 w-4 text-blue-400" />;
        case "transfer":
          return <Calendar className="h-4 w-4 text-purple-400" />;
        default:
          return <CreditCard className="h-4 w-4 text-gray-400" />;
      }
    };

    const getPaymentMethodText = (method: string) => {
      switch (method) {
        case "cash":
          return "نقدا";
        case "card":
          return "بطاقة";
        case "transfer":
          return "تحويل";
        default:
          return method;
      }
    };

    const handleDeletePayment = async () => {
      if (!paymentToDelete) return;

      try {
        await deletePayment(paymentToDelete.id);
        toast({
          title: "تم بنجاح",
          description: "تم حذف المدفوعات بنجاح",
          variant: "default",
        });
        await fetchPayments();
      } catch (error) {
        console.error("Error deleting payment:", error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء حذف المدفوعات",
          variant: "destructive",
        });
      } finally {
        setDeleteDialogOpen(false);
        setPaymentToDelete(null);
      }
    };

    const handleDeletePartialPayment = async (memberId: string) => {
      try {
        const { updateMember, getMemberById } = await import(
          "@/services/memberService"
        );
        const member = await getMemberById(memberId);
        if (member) {
          const updatedMember = {
            ...member,
            paymentStatus: "unpaid" as const,
            partialPaymentAmount: 0,
          };
          await updateMember(updatedMember);
          toast({
            title: "تم بنجاح",
            description: "تم حذف الدفع الجزئي بنجاح",
            variant: "default",
          });
          // Refresh the payments list to remove the partial payment card
          await fetchPayments();
          // Trigger refresh for parent components (like revenue cards)
          if (onRefresh) {
            // Force a refresh by incrementing the refresh counter
            window.dispatchEvent(new CustomEvent("paymentsUpdated"));
          }
        }
      } catch (error) {
        console.error("Error deleting partial payment:", error);
        toast({
          title: "خطأ",
          description: "حدث خطأ أثناء حذف الدفع الجزئي",
          variant: "destructive",
        });
      }
    };

    const openDeleteDialog = (payment: Payment) => {
      setPaymentToDelete(payment);
      setDeleteDialogOpen(true);
    };

    const handleEditPayment = (payment: Payment) => {
      if (onEditPayment) {
        onEditPayment(payment);
      }
    };

    const getTimeAgo = (dateString: string) => {
      const now = new Date();
      const paymentTime = new Date(dateString);
      const diffMs = now.getTime() - paymentTime.getTime();
      const diffMins = Math.round(diffMs / 60000);
      const diffHours = Math.round(diffMs / 3600000);
      const diffDays = Math.round(diffMs / 86400000);

      if (diffMins < 1) {
        return "الآن";
      } else if (diffMins < 60) {
        return `منذ ${formatNumber(diffMins)} دقيقة`;
      } else if (diffHours < 24) {
        return `منذ ${formatNumber(diffHours)} ساعة`;
      } else if (diffDays < 7) {
        return `منذ ${formatNumber(diffDays)} يوم`;
      } else {
        return paymentTime.toLocaleDateString("fr-FR", {
          month: "short",
          day: "numeric",
        });
      }
    };

    return (
      <Card className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-500 hover:border-slate-600/60">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-700/50 bg-gradient-to-r from-slate-800/50 to-slate-700/30">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-blue-400 to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-emerald-400" />
            سجل المدفوعات
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchPayments}
            className="text-xs flex items-center gap-2 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-full px-3 py-2 transition-all duration-200 border border-emerald-500/20 hover:border-emerald-400/40"
          >
            <RefreshCw className="h-3 w-3" />
            تحديث
          </Button>
        </CardHeader>
        <CardContent className="p-6 bg-gradient-to-b from-slate-800/20 to-slate-900/40">
          <div className="space-y-3">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-emerald-400/30 border-t-emerald-400 shadow-lg"></div>
                  <div className="text-slate-300 font-medium text-lg">
                    جاري التحميل...
                  </div>
                </div>
              </div>
            ) : payments.length === 0 && partialPayments.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center border border-slate-600/30 shadow-xl">
                  <CreditCard className="h-10 w-10 text-slate-400" />
                </div>
                <div className="text-slate-400 font-medium text-lg mb-2">
                  لا توجد مدفوعات
                </div>
                <div className="text-slate-500 text-sm">
                  ستظهر المدفوعات هنا عند إضافة دفعات جديدة
                </div>
              </div>
            ) : (
              <>
                {/* Partial Payments Section */}
                {partialPayments.map((partialPayment, index) => (
                  <div
                    key={`partial-${partialPayment.memberId}-${index}`}
                    className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-yellow-800/60 via-yellow-700/40 to-yellow-800/60 hover:from-yellow-700/70 hover:via-yellow-600/50 hover:to-yellow-700/70 border border-yellow-600/30 hover:border-yellow-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl backdrop-blur-sm"
                    style={{
                      animationDelay: `${index * 100}ms`,
                      animation: "fadeInUp 0.6s ease-out forwards",
                    }}
                  >
                    {/* Avatar Section */}
                    <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-slate-700/80 to-slate-800/80 flex items-center justify-center ring-2 ring-yellow-600/40 group-hover:ring-yellow-500/60 transition-all duration-300 shadow-lg flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-yellow-400" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full border-2 border-slate-800 shadow-lg flex items-center justify-center">
                        <AlertTriangle className="w-2 h-2 text-white" />
                      </div>
                    </div>

                    {/* Main Content - Mobile Optimized */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      {/* Mobile: Only Name and Amount */}
                      <div className="md:hidden">
                        <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors duration-200 truncate text-sm mb-1">
                          {partialPayment.memberName}
                        </h3>
                        <div className="flex items-center gap-1 text-green-400">
                          <DollarSign className="h-3 w-3" />
                          <span className="text-sm font-medium">
                            {formatNumber(partialPayment.amount)} دج
                          </span>
                        </div>
                      </div>

                      {/* Desktop: Full Layout */}
                      <div className="hidden md:flex flex-col justify-between py-1">
                        {/* Top Row: Name and Badge */}
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors duration-200 truncate text-sm">
                            دفع جزئي - {partialPayment.memberName}
                          </h3>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Badge className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white">
                              جزئي
                            </Badge>
                          </div>
                        </div>

                        {/* Bottom Row: Price and Subscription Info */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 text-xs flex-1">
                            <div className="flex items-center gap-1 text-green-400">
                              <DollarSign className="h-3 w-3" />
                              <span className="whitespace-nowrap">
                                {formatNumber(partialPayment.amount)} دج
                              </span>
                              <span className="text-yellow-400 text-xs whitespace-nowrap">
                                (من أصل{" "}
                                {formatNumber(
                                  partialPayment.totalSubscriptionPrice,
                                )}{" "}
                                دج)
                              </span>
                            </div>
                            {partialPayment.subscriptionType && (
                              <div className="flex items-center gap-1 text-blue-400">
                                <Calendar className="h-3 w-3" />
                                <span className="whitespace-nowrap">
                                  {partialPayment.subscriptionType}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-center flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 border-red-500/50 text-red-300 hover:bg-red-500/20 hover:border-red-400 transition-all duration-200 md:h-7 md:px-2 md:w-auto md:min-w-[60px]"
                        onClick={() =>
                          handleDeletePartialPayment(partialPayment.memberId)
                        }
                      >
                        <Trash2 className="h-3 w-3 md:mr-1" />
                        <span className="hidden md:inline">حذف</span>
                      </Button>
                    </div>
                  </div>
                ))}

                {/* Regular Payments */}
                {payments.map((payment, index) => {
                  // Get member data for avatar
                  const memberData = payments.find((p) => p.id === payment.id);

                  return (
                    <div
                      key={payment.id}
                      className="group flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-slate-800/60 via-slate-700/40 to-slate-800/60 hover:from-slate-700/70 hover:via-slate-600/50 hover:to-slate-700/70 border border-emerald-500/50 hover:border-emerald-400/60 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl backdrop-blur-sm"
                      style={{
                        animationDelay: `${(index + partialPayments.length) * 100}ms`,
                        animation: "fadeInUp 0.6s ease-out forwards",
                      }}
                    >
                      {/* Avatar Section */}
                      <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-slate-700/80 to-slate-800/80 flex items-center justify-center ring-2 ring-emerald-500/40 group-hover:ring-emerald-400/60 transition-all duration-300 shadow-lg flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
                          <CreditCard className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full border-2 border-slate-800 shadow-lg flex items-center justify-center">
                          <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        </div>
                      </div>

                      {/* Main Content - Mobile Optimized */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center">
                        {/* Mobile: Only Name and Amount */}
                        <div className="md:hidden">
                          <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors duration-200 truncate text-sm mb-1">
                            {payment.memberName}
                          </h3>
                          <div className="flex items-center gap-1 text-green-400">
                            <DollarSign className="h-3 w-3" />
                            <span className="text-sm font-medium">
                              {formatNumber(payment.amount)} دج
                            </span>
                          </div>
                        </div>

                        {/* Desktop: Full Layout */}
                        <div className="hidden md:flex flex-col justify-between py-1">
                          {/* Top Row: Name and Payment Status Badge */}
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <h3 className="font-semibold text-slate-100 group-hover:text-white transition-colors duration-200 truncate text-sm">
                              {payment.memberName}
                            </h3>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <Badge className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                                مدفوع
                              </Badge>
                            </div>
                          </div>

                          {/* Bottom Row: Price and Date Info */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 text-xs flex-1">
                              <div className="flex items-center gap-1 text-green-400">
                                <DollarSign className="h-3 w-3" />
                                <span className="whitespace-nowrap">
                                  {formatNumber(payment.amount)} دج
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-blue-400">
                                <Calendar className="h-3 w-3" />
                                <span className="whitespace-nowrap">
                                  {getTimeAgo(payment.date)}
                                </span>
                              </div>
                              {payment.subscriptionType && (
                                <div className="flex items-center gap-1 text-purple-400">
                                  <span className="whitespace-nowrap">
                                    {payment.subscriptionType}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons - Mobile Optimized */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Mobile: Only Delete Button */}
                        <div className="md:hidden">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-red-500/50 text-red-300 hover:bg-red-500/20 hover:border-red-400 transition-all duration-200"
                            onClick={() => openDeleteDialog(payment)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>

                        {/* Desktop: Full Action Buttons */}
                        <div className="hidden md:flex flex-col gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-all duration-300 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-blue-500/50 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 transition-all duration-200 min-w-[60px]"
                            onClick={() => handleEditPayment(payment)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            تعديل
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-xs border-red-500/50 text-red-300 hover:bg-red-500/20 hover:border-red-400 transition-all duration-200 min-w-[60px]"
                            onClick={() => openDeleteDialog(payment)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            حذف
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </CardContent>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription className="text-gray-300">
                هل أنت متأكد من حذف هذه المدفوعات؟ لا يمكن التراجع عن هذا
                الإجراء.
                {paymentToDelete && (
                  <div className="mt-2 p-2 bg-slate-700 rounded">
                    <div>
                      العضو: {paymentToDelete.memberName || "اسم العضو"}
                    </div>
                    <div>
                      المبلغ: {formatNumber(paymentToDelete.amount)} DZD
                    </div>
                    <div>النوع: {paymentToDelete.subscriptionType}</div>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-slate-700 border-slate-600 text-white hover:bg-slate-600">
                إلغاء
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeletePayment}
                className="bg-red-600 hover:bg-red-700"
              >
                حذف
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>
    );
  },
);

export default PaymentsList;
