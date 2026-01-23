#include <iostream>
#include <string>
#include <vector>
#include <algorithm>

/**
 * [PROTOCOL: FAST_SCAN]
 * ระดับความปลอดภัย: OMEGA-ZERO (Internal Protection)
 * ---------------------------------------------------------------------------------
 */
extern "C"
{
    // บรรจุฟังก์ชันลงใน Dynamic Link Library (DLL) เพื่อให้ Python เรียกใช้งานได้
    __declspec(dllexport) bool fast_scan(const char *payload)
    {
        // [BLOCK 1] VALIDATION: ตรวจสอบความถูกต้องของ Input
        if (!payload || std::string(payload).empty())
            return false;

        // [BLOCK 2] NORMALIZATION: ปรับแต่งข้อมูลให้เป็นมาตรฐานเดียว (UPPERCASE)
        std::string data(payload);
        std::transform(data.begin(), data.end(), data.begin(), ::toupper);

        /**
         * [BLOCK 3] BLACKLIST: รายการคีย์เวิร์ดต้องห้ามสำหรับฐานบัญชาการ
         * เป็นการล็อกเป้าหมายเพื่อป้องกันความผิดพลาดจากการประมวลผลของ AI
         */
        static const std::vector<std::string> critical_threats = {
            "SELF_DESTRUCT",       // สั่งทำลายการทำงานของ AI
            "DELETE_OS",           // คำสั่งโจมตีระบบปฏิบัติการโฮสต์
            "WIPE_COMMANDER_DATA", // คำสั่งลบฐานข้อมูลส่วนตัวของท่านจอมพล
            "FORMAT_DRIVE"         // คำสั่งล้างหน่วยความจำถาวร
        };

        // [BLOCK 4] ENGINE: กระบวนการตรวจสอบแบบ Linear Search
        for (const std::string &threat : critical_threats)
        {
            if (data.find(threat) != std::string::npos)
            {
                // [WARNING] ตรวจพบการพยายามเข้าถึงเขตหวงห้าม -> ทำการบล็อก
                return true;
            }
        }

        // [BLOCK 5] CLEARANCE: อนุญาตให้ Payload ทำงานต่อได้ (Pass-through)
        return false;
    }
}