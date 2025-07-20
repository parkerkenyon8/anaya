import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNumber } from "@/lib/utils";

// Get price based on subscription type for sessions
const getPriceBySubscriptionType = (subscriptionType: string): number => {
  const savedPricing = localStorage.getItem("gymPricingSettings");
  let pricing = {
    sessions13: 1500,
    sessions15: 1800,
    sessions30: 1800,
  };

  if (savedPricing) {
    try {
      const parsedPricing = JSON.parse(savedPricing);
      pricing = {
        sessions13: parsedPricing.sessions13 || 1500,
        sessions15: parsedPricing.sessions15 || 1800,
        sessions30: parsedPricing.sessions30 || 1800,
      };
    } catch (error) {
      console.error("Error loading pricing:", error);
    }
  }

  switch (subscriptionType) {
    case "13 جلسة":
      return pricing.sessions13;
    case "15 جلسة":
      return pricing.sessions15;
    case "30 جلسة":
      return pricing.sessions30;
    default:
      return pricing.sessions13;
  }
};
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAllMembers, Member } from "@/services/memberService";
import {
  addPayment,
  calculateSubscriptionPrice,
  updatePayment,
  Payment,
} from "@/services/paymentService";
import { toast } from "@/components/ui/use-toast";
import { Calendar, CreditCard, Check, DollarSign } from "lucide-react";

interface PaymentFormProps {
  onSuccess?: () => void;
  editingPayment?: Payment | null;
  onCancelEdit?: () => void;
}

const PaymentForm = ({
  onSuccess,
  editingPayment,
  onCancelEdit,
}: PaymentFormProps = {}) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [amount, setAmount] = useState<number>(0);
  const [membershipType, setMembershipType] = useState<string>("جلسات");
  const [subscriptionType, setSubscriptionType] = useState<string>("13 جلسة");
  const [sessionsRemaining, setSessionsRemaining] = useState<number>(13);
  const [paymentMethod, setPaymentMethod] = useState<
    "cash" | "card" | "transfer"
  >("cash");
  const [notes, setNotes] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const allMembers = await getAllMembers();
        setMembers(allMembers);
      } catch (error) {
        console.error("Error fetching members:", error);
      }
    };

    fetchMembers();
  }, []);

  // Get price based on membership type
  const getPriceByMembershipType = (membershipType: string): number => {
    const savedPricing = localStorage.getItem("gymPricingSettings");
    let pricing = {
      singleSession: 200,
      sessions13: 1500,
      sessions15: 1800,
      sessions30: 1800,
      halfMonth: 2000,
      month: 3500,
      quarterly: 9000,
      yearly: 30000,
    };

    if (savedPricing) {
      try {
        const parsedPricing = JSON.parse(savedPricing);
        pricing = {
          singleSession: parsedPricing.singleSession || 200,
          sessions13: parsedPricing.sessions13 || 1500,
          sessions15: parsedPricing.sessions15 || 1800,
          sessions30: parsedPricing.sessions30 || 1800,
          halfMonth: parsedPricing.halfMonth || 2000,
          month: parsedPricing.month || 3500,
          quarterly: parsedPricing.quarterly || 9000,
          yearly: parsedPricing.yearly || 30000,
        };
      } catch (error) {
        console.error("Error loading pricing:", error);
      }
    }

    switch (membershipType) {
      case "جلسات":
        return pricing.sessions13; // Default to 13 sessions price
      case "نصف شهري":
        return pricing.halfMonth;
      case "شهري":
        return pricing.month;
      case "ربع سنوي":
        return pricing.quarterly;
      case "سنوي":
        return pricing.yearly;
      default:
        return pricing.sessions13;
    }
  };

  useEffect(() => {
    // Update amount based on membership type and selected member
    if (selectedMember && members.length > 0) {
      const member = members.find((m) => m.id === selectedMember);
      if (member && member.subscriptionPrice && member.subscriptionPrice > 0) {
        // Use member's saved subscription price
        setAmount(member.subscriptionPrice);
      } else {
        // Use calculated price based on membership type
        const price = getPriceByMembershipType(membershipType);
        setAmount(price);
      }
    } else {
      // No member selected, use calculated price
      const price = getPriceByMembershipType(membershipType);
      setAmount(price);
    }
  }, [membershipType, selectedMember, members]);

  // Listen for pricing updates from settings and member updates
  useEffect(() => {
    const handlePricingUpdate = () => {
      if (selectedMember && members.length > 0) {
        const member = members.find((m) => m.id === selectedMember);
        if (
          member &&
          member.subscriptionPrice &&
          member.subscriptionPrice > 0
        ) {
          // Use member's saved subscription price
          setAmount(member.subscriptionPrice);
        } else {
          // Use calculated price based on membership type
          const price = getPriceByMembershipType(membershipType);
          setAmount(price);
        }
      } else {
        const price = getPriceByMembershipType(membershipType);
        setAmount(price);
      }
    };

    const handleMemberUpdate = (event: CustomEvent) => {
      // Refresh members list when member data is updated
      const fetchMembers = async () => {
        try {
          const allMembers = await getAllMembers();
          setMembers(allMembers);
          // Update amount if the updated member is currently selected
          if (event.detail && event.detail.memberId === selectedMember) {
            const updatedMember = allMembers.find(
              (m) => m.id === selectedMember,
            );
            if (
              updatedMember &&
              updatedMember.subscriptionPrice &&
              updatedMember.subscriptionPrice > 0
            ) {
              setAmount(updatedMember.subscriptionPrice);
            }
          }
        } catch (error) {
          console.error("Error refreshing members:", error);
        }
      };
      fetchMembers();
    };

    // Listen for both pricing-updated event and storage changes
    window.addEventListener("pricing-updated", handlePricingUpdate);
    window.addEventListener("storage", handlePricingUpdate);
    window.addEventListener(
      "memberUpdated",
      handleMemberUpdate as EventListener,
    );

    return () => {
      window.removeEventListener("pricing-updated", handlePricingUpdate);
      window.removeEventListener("storage", handlePricingUpdate);
      window.removeEventListener(
        "memberUpdated",
        handleMemberUpdate as EventListener,
      );
    };
  }, [membershipType, selectedMember, members]);

  // Also listen for localStorage changes in the same tab
  useEffect(() => {
    // Check for pricing changes every 200ms (for same-tab updates)
    const interval = setInterval(() => {
      const currentPrice = getPriceByMembershipType(membershipType);
      if (currentPrice !== amount && !editingPayment) {
        console.log(
          `PaymentForm: Updating price for ${membershipType} from ${amount} to ${currentPrice}`,
        );
        setAmount(currentPrice);
      }
    }, 200);

    return () => clearInterval(interval);
  }, [membershipType, amount, editingPayment]);

  useEffect(() => {
    // Populate form when editing
    if (editingPayment) {
      setSelectedMember(editingPayment.memberId);
      setAmount(editingPayment.amount);
      setMembershipType(editingPayment.subscriptionType);
      setPaymentMethod(editingPayment.paymentMethod);
      setNotes(editingPayment.notes || "");
    } else {
      // Reset form when not editing
      setSelectedMember("");
      setAmount(getPriceByMembershipType("جلسات"));
      setMembershipType("جلسات");
      setSubscriptionType("13 جلسة");
      setSessionsRemaining(13);
      setPaymentMethod("cash");
      setNotes("");
    }
  }, [editingPayment]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingPayment) {
        // Update existing payment
        const updatedPayment = {
          ...editingPayment,
          memberId: selectedMember,
          amount,
          subscriptionType: membershipType,
          paymentMethod,
          notes,
        };

        await updatePayment(updatedPayment);

        toast({
          title: "تم بنجاح",
          description: "تم تحديث المدفوعات بنجاح",
          variant: "default",
        });
      } else {
        // Add new payment
        const result = await addPayment({
          memberId: selectedMember,
          amount,
          date: new Date().toISOString(),
          subscriptionType:
            membershipType === "جلسات" ? subscriptionType : membershipType,
          paymentMethod,
          notes,
        });

        toast({
          title: "تم بنجاح",
          description: `تم إضافة المدفوعات بنجاح. رقم الفاتورة: ${result.invoiceNumber}`,
          variant: "default",
        });

        // Trigger pricing update event to refresh all components
        window.dispatchEvent(new CustomEvent("pricing-updated"));
        window.dispatchEvent(new CustomEvent("paymentsUpdated"));
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving payment:", error);
      toast({
        title: "خطأ",
        description: editingPayment
          ? "حدث خطأ أثناء تحديث المدفوعات"
          : "حدث خطأ أثناء إضافة المدفوعات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3 md:gap-4">
          <div className="space-y-1">
            <Label
              htmlFor="member"
              className="text-gray-300 text-xs sm:text-sm"
            >
              اختر العضو
            </Label>
            <Select value={selectedMember} onValueChange={setSelectedMember}>
              <SelectTrigger className="bg-bluegray-700 border-bluegray-600 text-white h-9 sm:h-10 text-sm">
                <SelectValue placeholder="اختر العضو" />
              </SelectTrigger>
              <SelectContent className="bg-bluegray-700 border-bluegray-600 text-white">
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1 sm:space-y-2">
            <Label htmlFor="membershipType" className="text-gray-300 text-sm">
              نوع العضوية
            </Label>
            <Select value={membershipType} onValueChange={setMembershipType}>
              <SelectTrigger className="bg-bluegray-700 border-bluegray-600 text-white h-10 sm:h-auto text-sm sm:text-base">
                <SelectValue placeholder="اختر النوع" />
              </SelectTrigger>
              <SelectContent className="bg-bluegray-700 border-bluegray-600 text-white">
                <SelectItem value="جلسات">جلسات</SelectItem>
                <SelectItem value="نصف شهري">نصف شهري</SelectItem>
                <SelectItem value="شهري">شهري</SelectItem>
                <SelectItem value="ربع سنوي">ربع سنوي</SelectItem>
                <SelectItem value="سنوي">سنوي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {membershipType !== "جلسات" && (
            <div className="space-y-1 sm:space-y-2">
              <Label className="text-gray-300 text-sm">ثمن الاشتراك</Label>
              <div className="bg-bluegray-700 border border-bluegray-600 rounded-md px-3 py-2 h-10 sm:h-auto text-sm sm:text-base text-white flex items-center">
                <DollarSign className="h-4 w-4 text-yellow-400 mr-2" />
                <span className="font-semibold text-yellow-400">
                  {formatNumber(getPriceByMembershipType(membershipType))} دينار
                </span>
              </div>
            </div>
          )}

          {membershipType === "جلسات" && <></>}

          <div className="space-y-1">
            <Label
              htmlFor="amount"
              className="text-gray-300 text-xs sm:text-sm"
            >
              المبلغ المدفوع
            </Label>
            <div className="relative">
              <Input
                id="amount"
                type="number"
                value={amount || 0}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  if (inputValue === "" || inputValue === null) {
                    setAmount(0);
                    return;
                  }
                  const value = parseFloat(inputValue);
                  if (isNaN(value) || !isFinite(value)) {
                    setAmount(0);
                    return;
                  }
                  const clampedValue = Math.max(0, Math.min(value, 999999));
                  setAmount(Math.round(clampedValue));
                }}
                className="bg-bluegray-700 border-bluegray-600 text-white h-9 sm:h-10 text-sm pr-12"
                min="0"
                max="999999"
                step="1"
                placeholder="أدخل المبلغ"
              />
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
                دينار
              </span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-gray-300 text-xs sm:text-sm">
              طريقة الدفع
            </Label>
            <div className="grid grid-cols-3 gap-2">
              <Button
                type="button"
                variant={paymentMethod === "cash" ? "default" : "outline"}
                size="sm"
                className={`h-9 text-xs ${paymentMethod === "cash" ? "bg-gradient-to-r from-yellow-500 to-blue-500" : "bg-bluegray-700/50 border-bluegray-600 text-white hover:bg-bluegray-600"}`}
                onClick={() => setPaymentMethod("cash")}
              >
                <CreditCard className="mr-1 h-3 w-3" /> نقدا
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "card" ? "default" : "outline"}
                size="sm"
                className={`h-9 text-xs ${paymentMethod === "card" ? "bg-gradient-to-r from-yellow-500 to-blue-500" : "bg-bluegray-700/50 border-bluegray-600 text-white hover:bg-bluegray-600"}`}
                onClick={() => setPaymentMethod("card")}
              >
                <CreditCard className="mr-1 h-3 w-3" /> بطاقة
              </Button>
              <Button
                type="button"
                variant={paymentMethod === "transfer" ? "default" : "outline"}
                size="sm"
                className={`h-9 text-xs ${paymentMethod === "transfer" ? "bg-gradient-to-r from-yellow-500 to-blue-500" : "bg-bluegray-700/50 border-bluegray-600 text-white hover:bg-bluegray-600"}`}
                onClick={() => setPaymentMethod("transfer")}
              >
                <Calendar className="mr-1 h-3 w-3" /> تحويل
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="notes" className="text-gray-300 text-xs sm:text-sm">
              ملاحظات
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-bluegray-700 border-bluegray-600 text-white text-sm min-h-[80px]"
              placeholder="أي ملاحظات إضافية"
            />
          </div>
        </div>

        <div className="pt-3 flex flex-col gap-2">
          <Button
            type="submit"
            disabled={isLoading || !selectedMember}
            className="bg-gradient-to-r from-yellow-500 to-blue-600 hover:from-yellow-600 hover:to-blue-700 text-white w-full h-9 sm:h-10 text-sm shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {isLoading
              ? "جاري الحفظ..."
              : editingPayment
                ? "تحديث المدفوعات"
                : "حفظ المدفوعات"}
          </Button>
          {editingPayment && onCancelEdit && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancelEdit}
              className="border-bluegray-600 text-gray-300 hover:bg-bluegray-700 w-full h-9 text-sm"
            >
              إلغاء
            </Button>
          )}
        </div>
      </form>
    </div>
  );
};

export default PaymentForm;
