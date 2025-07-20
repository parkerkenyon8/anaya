import React from "react";
import { Camera, Upload, Trash2 } from "lucide-react";
import { formatNumber } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Member } from "@/services/memberService";

interface MemberDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (member: Partial<Member>) => void;
  onDelete?: (id: string) => void;
  member?: Member;
  title: string;
}

const MemberDialog = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  member,
  title,
}: MemberDialogProps) => {
  const [previewImage, setPreviewImage] = React.useState<string>("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const cameraInputRef = React.useRef<HTMLInputElement>(null);

  // Get current pricing from settings
  const getCurrentPrice = (subscriptionType: string): number => {
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

  // Get price based on membership type
  const getPriceByMembershipType = (membershipType: string): number => {
    const savedPricing = localStorage.getItem("gymPricingSettings");
    let pricing = {
      singleSession: 200,
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
      case "نصف شهري":
        return pricing.halfMonth;
      case "شهري":
        return pricing.month;
      case "ربع سنوي":
        return pricing.quarterly;
      case "سنوي":
        return pricing.yearly;
      default:
        return 0;
    }
  };

  const [formData, setFormData] = React.useState<Partial<Member>>({
    name: "",
    membershipStatus: "active",
    lastAttendance: "",
    imageUrl: "",
    phoneNumber: "",
    membershipType: "شهري",
    membershipStartDate: new Date().toISOString().split("T")[0],
    membershipEndDate: new Date(new Date().setMonth(new Date().getMonth() + 1))
      .toISOString()
      .split("T")[0],
    subscriptionType: "13 حصة",
    sessionsRemaining: 13,
    subscriptionPrice: 1000,
    paymentStatus: "unpaid",
  });

  React.useEffect(() => {
    if (member) {
      setFormData(member);
      setPreviewImage(member.imageUrl || "");
    } else {
      setFormData({
        name: "",
        membershipStatus: "active",
        lastAttendance: "",
        imageUrl: "",
        phoneNumber: "",
        membershipType: "جلسات",
        membershipStartDate: new Date().toISOString().split("T")[0],
        membershipEndDate: new Date(
          new Date().setMonth(new Date().getMonth() + 1),
        )
          .toISOString()
          .split("T")[0],
        subscriptionType: "13 جلسة",
        sessionsRemaining: 13,
        subscriptionPrice: 1500,
        paymentStatus: "unpaid",
      });
      setPreviewImage("");
    }
  }, [member, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Auto-calculate end date when start date changes based on membership type
      if (name === "membershipStartDate" && prev.membershipType) {
        const startDate = new Date(value);
        const endDate = new Date(startDate);

        if (prev.membershipType === "نصف شهري") {
          endDate.setDate(startDate.getDate() + 15);
        } else if (prev.membershipType === "شهري") {
          endDate.setMonth(startDate.getMonth() + 1);
        } else if (prev.membershipType === "ربع سنوي") {
          endDate.setMonth(startDate.getMonth() + 3);
        } else if (prev.membershipType === "سنوي") {
          endDate.setFullYear(startDate.getFullYear() + 1);
        }

        // Only update end date for time-based memberships
        if (
          ["نصف شهري", "شهري", "ربع سنوي", "سنوي"].includes(prev.membershipType)
        ) {
          newData.membershipEndDate = endDate.toISOString().split("T")[0];
        }
      }

      return newData;
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [name]: value };

      // Auto-calculate price and end date for time-based memberships
      if (name === "membershipType") {
        const startDate = new Date(prev.membershipStartDate || new Date());
        const endDate = new Date(startDate);

        if (value === "نصف شهري") {
          endDate.setDate(startDate.getDate() + 15);
          newData.subscriptionPrice = getPriceByMembershipType(value);
          newData.membershipEndDate = endDate.toISOString().split("T")[0];
        } else if (value === "شهري") {
          endDate.setMonth(startDate.getMonth() + 1);
          newData.subscriptionPrice = getPriceByMembershipType(value);
          newData.membershipEndDate = endDate.toISOString().split("T")[0];
        } else if (value === "ربع سنوي") {
          endDate.setMonth(startDate.getMonth() + 3);
          newData.subscriptionPrice = getPriceByMembershipType(value);
          newData.membershipEndDate = endDate.toISOString().split("T")[0];
        } else if (value === "سنوي") {
          endDate.setFullYear(startDate.getFullYear() + 1);
          newData.subscriptionPrice = getPriceByMembershipType(value);
          newData.membershipEndDate = endDate.toISOString().split("T")[0];
        }
      }

      return newData;
    });
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const triggerCameraInput = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setPreviewImage(imageUrl);
        setFormData((prev) => ({ ...prev, imageUrl }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Generate a random avatar if none provided
    if (!formData.imageUrl) {
      const seed = Math.random().toString(36).substring(2, 8);
      formData.imageUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    }

    // Check if payment status changed from unpaid/partial to paid
    const paymentStatusChanged =
      member &&
      member.paymentStatus !== "paid" &&
      formData.paymentStatus === "paid";

    // Check if this is a new member with paid status or subscription type changed
    const isNewPaidMember = !member && formData.paymentStatus === "paid";
    const subscriptionTypeChanged =
      member && member.subscriptionType !== formData.subscriptionType;

    // Check if subscription price changed
    const subscriptionPriceChanged =
      member && member.subscriptionPrice !== formData.subscriptionPrice;

    // Create payment record if needed
    if (
      formData.subscriptionType &&
      formData.subscriptionPrice &&
      (paymentStatusChanged ||
        isNewPaidMember ||
        (subscriptionTypeChanged && formData.paymentStatus === "paid"))
    ) {
      try {
        // Import payment service dynamically to avoid circular dependency
        const { addPayment } = await import("@/services/paymentService");

        // Use the subscription price from form data
        const amount = formData.subscriptionPrice;

        // Add payment record
        if (amount > 0) {
          await addPayment({
            memberId: member?.id || Date.now().toString(), // Use existing ID or temporary one
            amount,
            date: new Date().toISOString(),
            subscriptionType: formData.subscriptionType,
            paymentMethod: "cash", // Default payment method
            notes: paymentStatusChanged
              ? `تحديث حالة الدفع - ${formData.name}`
              : `اشتراك جديد - ${formData.name}`,
            status: "completed",
          });
        }
      } catch (error) {
        console.error("Error creating payment record:", error);
      }
    }

    // Save the member data with updated subscription price
    const updatedMemberData = {
      ...formData,
      subscriptionPrice: Number(formData.subscriptionPrice) || 0,
    };

    onSave(updatedMemberData);

    // Always trigger pricing update events when saving member data
    // This ensures that PaymentsPage and PendingPaymentsPage reflect the correct prices
    window.dispatchEvent(new CustomEvent("pricing-updated"));
    window.dispatchEvent(new CustomEvent("paymentsUpdated"));
    window.dispatchEvent(
      new CustomEvent("memberUpdated", {
        detail: {
          memberId: member?.id || formData.id,
          subscriptionPrice: formData.subscriptionPrice,
          subscriptionType: formData.subscriptionType,
          timestamp: Date.now(),
        },
      }),
    );

    // Also trigger storage event for cross-component communication
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: "memberPricingUpdate",
        newValue: JSON.stringify({
          memberId: member?.id || formData.id,
          subscriptionPrice: formData.subscriptionPrice,
          subscriptionType: formData.subscriptionType,
          timestamp: Date.now(),
        }),
      }),
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gradient-to-br from-bluegray-800/95 to-bluegray-900/95 backdrop-blur-xl text-white border border-bluegray-600/50 shadow-2xl max-w-sm sm:max-w-md w-full max-h-[95vh] overflow-y-auto mx-2 sm:mx-4 md:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold bg-gradient-to-r from-yellow-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            {title}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-4">
          <div className="flex flex-col items-center mb-2 sm:mb-4">
            <div className="relative w-12 h-12 sm:w-20 sm:h-20 md:w-24 md:h-24 mb-1 sm:mb-2 overflow-hidden rounded-full border-2 border-bluegray-600 bg-bluegray-700 shadow-lg">
              {previewImage ? (
                <img
                  src={previewImage}
                  alt="صورة العضو"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                  صورة
                </div>
              )}
            </div>

            <div className="flex gap-1 sm:gap-2 mt-1 sm:mt-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-1 border-bluegray-600/50 text-gray-300 hover:bg-bluegray-700 text-xs py-1 sm:py-2 backdrop-blur-sm transition-all duration-300 hover:scale-105 flex-1"
                onClick={triggerFileInput}
              >
                <Upload className="h-2 w-2 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">رفع صورة</span>
                <span className="sm:hidden">رفع</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="flex items-center justify-center gap-1 border-bluegray-600/50 text-gray-300 hover:bg-bluegray-700 text-xs py-1 sm:py-2 backdrop-blur-sm transition-all duration-300 hover:scale-105 flex-1"
                onClick={triggerCameraInput}
              >
                <Camera className="h-2 w-2 sm:h-3 sm:w-3" />
                <span className="hidden sm:inline">التقاط صورة</span>
                <span className="sm:hidden">كاميرا</span>
              </Button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />

            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-1 gap-1.5 sm:gap-3 md:gap-4">
            <div className="space-y-0.5 sm:space-y-1">
              <Label
                htmlFor="name"
                className="text-gray-300 text-xs sm:text-sm"
              >
                الاسم
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="bg-bluegray-700 border-bluegray-600 text-white h-8 sm:h-10 text-xs sm:text-sm"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:gap-4">
              <div className="space-y-0.5 sm:space-y-1">
                <Label
                  htmlFor="membershipStatus"
                  className="text-gray-300 text-xs sm:text-sm"
                >
                  حالة العضوية
                </Label>
                <Select
                  value={formData.membershipStatus}
                  onValueChange={(value) =>
                    handleSelectChange("membershipStatus", value)
                  }
                >
                  <SelectTrigger className="bg-bluegray-700 border-bluegray-600 text-white h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="اختر الحالة" />
                  </SelectTrigger>
                  <SelectContent className="bg-bluegray-700 border-bluegray-600 text-white">
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="pending">معلق</SelectItem>
                    <SelectItem value="expired">منتهي</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5 sm:space-y-1">
                <Label
                  htmlFor="membershipType"
                  className="text-gray-300 text-xs sm:text-sm"
                >
                  نوع العضوية
                </Label>
                <Select
                  value={formData.membershipType}
                  onValueChange={(value) =>
                    handleSelectChange("membershipType", value)
                  }
                >
                  <SelectTrigger className="bg-bluegray-700 border-bluegray-600 text-white h-8 sm:h-10 text-xs sm:text-sm">
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
            </div>

            {formData.membershipType !== "جلسات" && (
              <div className="space-y-0.5 sm:space-y-1">
                <Label className="text-gray-300 text-xs sm:text-sm">
                  ثمن الاشتراك
                </Label>
                <div className="bg-bluegray-700 border border-bluegray-600 rounded-md px-2 py-1.5 sm:px-3 sm:py-2 h-8 sm:h-10 text-xs sm:text-sm text-white flex items-center">
                  <span className="font-semibold text-yellow-400">
                    {formatNumber(
                      getPriceByMembershipType(formData.membershipType || ""),
                    )}{" "}
                    دينار
                  </span>
                </div>
              </div>
            )}

            {formData.membershipType === "جلسات" && (
              <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:gap-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <Label
                    htmlFor="sessionsRemaining"
                    className="text-gray-300 text-xs sm:text-sm"
                  >
                    عدد الجلسات
                  </Label>
                  <Input
                    id="sessionsRemaining"
                    name="sessionsRemaining"
                    type="number"
                    value={formData.sessionsRemaining || ""}
                    onChange={handleChange}
                    className="bg-bluegray-700 border-bluegray-600 text-white h-8 sm:h-10 text-xs sm:text-sm"
                    placeholder="عدد الجلسات"
                  />
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <Label
                    htmlFor="subscriptionPrice"
                    className="text-gray-300 text-xs sm:text-sm"
                  >
                    الثمن
                  </Label>
                  <div className="relative">
                    <Input
                      id="subscriptionPrice"
                      name="subscriptionPrice"
                      type="number"
                      value={formData.subscriptionPrice || ""}
                      onChange={handleChange}
                      className="bg-bluegray-700 border-bluegray-600 text-white h-8 sm:h-10 text-xs sm:text-sm pr-8 sm:pr-12"
                      placeholder="الثمن"
                    />
                    <span className="absolute left-1 sm:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs sm:text-sm">
                      دينار
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:gap-4">
              <div className="space-y-0.5 sm:space-y-1">
                <Label
                  htmlFor="paymentStatus"
                  className="text-gray-300 text-xs sm:text-sm"
                >
                  حالة الدفع
                </Label>
                <Select
                  value={formData.paymentStatus}
                  onValueChange={(value) =>
                    handleSelectChange("paymentStatus", value)
                  }
                >
                  <SelectTrigger className="bg-bluegray-700 border-bluegray-600 text-white h-8 sm:h-10 text-xs sm:text-sm">
                    <SelectValue placeholder="اختر حالة الدفع" />
                  </SelectTrigger>
                  <SelectContent className="bg-bluegray-700 border-bluegray-600 text-white">
                    <SelectItem value="paid">مدفوع</SelectItem>
                    <SelectItem value="unpaid">غير مدفوع</SelectItem>
                    <SelectItem value="partial">مدفوع جزئياً</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <Label
                  htmlFor="phoneNumber"
                  className="text-gray-300 text-xs sm:text-sm"
                >
                  رقم الهاتف
                </Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  className="bg-bluegray-700 border-bluegray-600 text-white h-8 sm:h-10 text-xs sm:text-sm"
                  placeholder="رقم الهاتف"
                />
              </div>
            </div>

            {formData.paymentStatus === "partial" && (
              <div className="space-y-0.5 sm:space-y-1">
                <Label
                  htmlFor="partialPaymentAmount"
                  className="text-gray-300 text-xs sm:text-sm"
                >
                  المبلغ المدفوع جزئياً
                </Label>
                <Input
                  id="partialPaymentAmount"
                  name="partialPaymentAmount"
                  type="number"
                  value={formData.partialPaymentAmount || ""}
                  onChange={handleChange}
                  className="bg-bluegray-700 border-bluegray-600 text-white h-8 sm:h-10 text-xs sm:text-sm"
                  placeholder="المبلغ المدفوع"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-1.5 sm:gap-3 md:gap-4">
              <div className="space-y-0.5 sm:space-y-1">
                <Label
                  htmlFor="membershipStartDate"
                  className="text-gray-300 text-xs sm:text-sm"
                >
                  تاريخ البدء
                </Label>
                <Input
                  id="membershipStartDate"
                  name="membershipStartDate"
                  type="date"
                  value={formData.membershipStartDate}
                  onChange={handleChange}
                  className="bg-bluegray-700 border-bluegray-600 text-white h-8 sm:h-10 text-xs sm:text-sm"
                />
              </div>

              <div className="space-y-0.5 sm:space-y-1">
                <Label
                  htmlFor="membershipEndDate"
                  className="text-gray-300 text-xs sm:text-sm"
                >
                  تاريخ الانتهاء
                </Label>
                <Input
                  id="membershipEndDate"
                  name="membershipEndDate"
                  type="date"
                  value={formData.membershipEndDate}
                  onChange={handleChange}
                  className="bg-bluegray-700 border-bluegray-600 text-white h-8 sm:h-10 text-xs sm:text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 sm:pt-3 flex flex-col gap-1.5 sm:gap-2">
            <Button
              type="submit"
              className="bg-gradient-to-r from-yellow-500 to-blue-600 hover:from-yellow-600 hover:to-blue-700 text-white w-full h-8 sm:h-10 text-xs sm:text-sm shadow-lg hover:shadow-xl transition-all duration-300"
            >
              حفظ
            </Button>
            <div className="flex gap-1.5 sm:gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-bluegray-600 text-gray-300 hover:bg-bluegray-700 flex-1 h-8 sm:h-9 text-xs sm:text-sm"
              >
                إلغاء
              </Button>
              {member && onDelete && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (confirm("هل أنت متأكد من حذف هذا العضو؟")) {
                      onDelete(member.id);
                      onClose();
                    }
                  }}
                  className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white flex-1 h-8 sm:h-9 text-xs sm:text-sm"
                >
                  <Trash2 className="h-2 w-2 sm:h-3 sm:w-3 mr-1" />
                  حذف
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default MemberDialog;
